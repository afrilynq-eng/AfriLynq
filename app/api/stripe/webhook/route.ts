import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { serviceClient } from "@/lib/supabase";

/**
 * What Stripe tells us, rather than what we ask it.
 *
 * Identity checks are not instant. A supplier can finish the form and be
 * payable twenty minutes later, or be asked for another document the next
 * morning. Polling Stripe from a page would mean the only time we learn
 * anything is while somebody happens to be looking at it, which for a
 * farmer who filled the form once and went back to work is never.
 *
 * So Stripe pushes. This route is the only thing in AfriLynq that may set
 * payouts_enabled, apart from the supplier's own refresh on the payouts
 * page, and the two agree because both take Stripe's answer verbatim.
 *
 * Security: the signature is checked before the body is trusted. Without
 * that, anyone who knew this URL could mark any company payable. The raw
 * text is required for the check, which is why this reads req.text() and
 * not req.json().
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Events we act on. Everything else is acknowledged and ignored. */
const HANDLED = new Set(["account.updated", "account.application.deauthorized"]);

export async function POST(req: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    // 503 rather than 200: Stripe should retry once we are configured.
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    // A bad signature is either a misconfigured endpoint secret or
    // somebody probing. Neither should be retried, so 400.
    console.error("[stripe] webhook signature rejected", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (!HANDLED.has(event.type)) {
    // 200, or Stripe retries it for three days.
    return NextResponse.json({ received: true });
  }

  try {
    if (event.type === "account.updated") {
      await onAccountUpdated(event.data.object as Stripe.Account);
    } else {
      await onDeauthorized(event.account ?? null);
    }
  } catch (error) {
    // 500 asks Stripe to try again. A database blip should not lose a
    // status change permanently.
    console.error(`[stripe] webhook ${event.type} failed`, error);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Stripe's verdict on an account, written down.
 *
 * Matched on stripe_account_id, which stage4-01 made unique, so this
 * cannot touch the wrong company. The update is a no-op when the id
 * belongs to an account we never created, which is what should happen if
 * this endpoint is ever pointed at the wrong platform.
 */
async function onAccountUpdated(account: Stripe.Account) {
  const enabled = Boolean(account.payouts_enabled);
  const due = account.requirements?.currently_due ?? [];

  const { error } = await serviceClient()
    .from("companies")
    .update({ payouts_enabled: enabled, stripe_requirements_due: due })
    .eq("stripe_account_id", account.id);

  if (error) throw new Error(error.message);
}

/**
 * The account is gone from our platform.
 *
 * The id is kept rather than cleared: it is the audit trail for any money
 * that already moved. Only payability is withdrawn.
 */
async function onDeauthorized(accountId: string | null) {
  if (!accountId) return;

  const { error } = await serviceClient()
    .from("companies")
    .update({ payouts_enabled: false })
    .eq("stripe_account_id", accountId);

  if (error) throw new Error(error.message);
}
