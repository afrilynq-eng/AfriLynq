import { NextResponse } from "next/server";
import { verifyWebhookHash, parseTxRef, isFlutterwaveConfigured } from "@/lib/flutterwave";
import { settlePayment } from "@/lib/payments";

/**
 * What Flutterwave tells us about money arriving.
 *
 * Three independent checks before a single figure is believed, because
 * this endpoint is the one place where an outsider could try to mark an
 * order paid without paying:
 *
 *   1. The secret hash header. Flutterwave does NOT sign the body, it
 *      simply sends back the hash typed into their dashboard. So this
 *      proves the sender knows a shared secret, nothing more.
 *   2. The tx_ref. Ours carry an HMAC of the payment reference, so a
 *      reference we never minted is rejected without a database read.
 *   3. The verification call. Every amount, currency and status written
 *      down comes from asking Flutterwave directly, never from the body
 *      of this request. Point 1 decides whether to listen. This decides
 *      what is true.
 *
 * The third is the one that matters. A body can say anything.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isFlutterwaveConfigured() || !process.env.FLUTTERWAVE_SECRET_HASH) {
    // 503 rather than 200, so Flutterwave retries once we are configured.
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  if (!verifyWebhookHash(req.headers.get("verif-hash"))) {
    console.warn("[flutterwave] webhook rejected: bad or missing verif-hash");
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    event?: string;
    data?: { id?: number | string; tx_ref?: string; status?: string };
  } | null;

  if (!body?.data) {
    return NextResponse.json({ error: "No payload." }, { status: 400 });
  }

  // Only charge events matter here. Transfers get their own handler when
  // payouts are built. Everything else is acknowledged so Flutterwave
  // stops retrying it.
  const event = body.event ?? "";
  if (!event.startsWith("charge.")) {
    return NextResponse.json({ received: true });
  }

  const reference = parseTxRef(body.data.tx_ref);
  if (!reference) {
    console.warn("[flutterwave] webhook rejected: tx_ref not ours", body.data.tx_ref);
    // 200, because retrying will not make it ours.
    return NextResponse.json({ received: true });
  }

  const transactionId = body.data.id;
  if (!transactionId) {
    return NextResponse.json({ error: "No transaction id." }, { status: 400 });
  }

  try {
    await settlePayment(reference, String(transactionId));
  } catch (error) {
    // 500 asks Flutterwave to try again. A database blip should not lose a
    // payment permanently.
    console.error("[flutterwave] webhook handler failed", error);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
