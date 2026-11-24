import { redirect } from "next/navigation";
import { parseTxRef, isFlutterwaveConfigured } from "@/lib/flutterwave";
import { settlePayment } from "@/lib/payments";
import { currentUser } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * Where Flutterwave sends the buyer back to.
 *
 * This page settles the payment immediately rather than waiting for the
 * webhook, for one reason: a buyer who has just paid should see their
 * order updated when they land, not whenever a webhook happens to arrive.
 * Making them refresh a page that says "awaiting payment" after they have
 * been charged is how a marketplace loses trust in a single screen.
 *
 * It is not a replacement for the webhook. Webhooks get lost; so do
 * buyers, who close the tab before the redirect. Both paths run the same
 * settlement, which is written to be safe to run twice.
 *
 * Nothing here trusts the query string. Flutterwave puts status, tx_ref
 * and transaction_id in the URL, and anyone can type a URL. The tx_ref is
 * checked against its own HMAC, and the amount, currency and status are
 * then read from Flutterwave's API, not from these parameters.
 */
export default async function PaymentReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; tx_ref?: string; transaction_id?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const order = `/account/orders/${id}`;

  // Cancelled at Flutterwave's page. Nothing was charged, the order is
  // still awaiting payment, and the buyer can try again.
  if (query.status === "cancelled") redirect(`${order}?payment=cancelled`);

  const reference = parseTxRef(query.tx_ref);

  if (!isFlutterwaveConfigured() || !reference || !query.transaction_id) {
    redirect(`${order}?payment=unknown`);
  }

  try {
    await settlePayment(reference, String(query.transaction_id));
  } catch (error) {
    // The webhook will almost certainly settle it a moment later, so this
    // is not the buyer's problem to solve. Send them to the order, which
    // will show the truth either way.
    console.error("[flutterwave] return settlement failed", error);
    redirect(`${order}?payment=pending`);
  }

  redirect(`${order}?payment=done`);
}
