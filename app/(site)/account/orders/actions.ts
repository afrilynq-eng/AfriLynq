"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUser, sessionClient } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import { SERVICE_CHARGE_PERCENT } from "@/lib/fees";
import {
  createCheckout,
  buildTxRef,
  flutterwaveMessage,
  isFlutterwaveConfigured,
} from "@/lib/flutterwave";

/**
 * Turning an accepted quotation into an order, and an order into money.
 *
 * Two steps, deliberately separate.
 *
 * Accepting a quotation creates the order and stops. Paying is a second,
 * repeatable action. A buyer who accepts at eleven at night and pays the
 * next morning still has an order the supplier can see and chase, and an
 * abandoned checkout is retried rather than stranding anybody. One combined
 * step would mean a closed tab leaves nothing behind at all.
 */

/* ------------------------------------------------------------------
   The order
   ------------------------------------------------------------------ */

/**
 * Creates the order for a quotation that has just been accepted.
 *
 * Called from respondToQuotation, with the service key, because the buyer
 * accepting is allowed to create this order but is not allowed to write
 * whatever they like into it. The amounts come from the quotation, which
 * only the supplier could set, so a buyer cannot accept at a price of
 * their own choosing.
 */
export async function createOrderForQuotation(quotationId: string, userId: string) {
  const svc = serviceClient();

  const { data: q } = await svc
    .from("quotations")
    .select(
      "id, enquiry_id, supplier_company_id, buyer_company_id, currency, total_minor, incoterm, status"
    )
    .eq("id", quotationId)
    .maybeSingle();

  if (!q) return { ok: false as const, message: "That quotation no longer exists." };

  const quote = q as {
    id: string;
    enquiry_id: string;
    supplier_company_id: string;
    buyer_company_id: string | null;
    currency: string;
    total_minor: number;
    incoterm: string | null;
  };

  // A shopper has no company. stage4-04 taught orders the same rule
  // quotations learned in stage3-06: one buyer or the other, never both.
  const { data: enq } = await svc
    .from("enquiries")
    .select("buyer_company_id, buyer_profile_id, delivery_country_code, delivery_address")
    .eq("id", quote.enquiry_id)
    .maybeSingle();

  const enquiry = enq as {
    buyer_company_id: string | null;
    buyer_profile_id: string | null;
    delivery_country_code: string | null;
    delivery_address: string | null;
  } | null;

  const buyerCompanyId = quote.buyer_company_id ?? enquiry?.buyer_company_id ?? null;
  const buyerProfileId = buyerCompanyId ? null : (enquiry?.buyer_profile_id ?? userId);

  // The commission is fixed at the moment of acceptance, not read live when
  // the payout is made. If Richard changes the rate in January, an order
  // agreed in December keeps the rate it was agreed under.
  const commissionMinor = Math.round((quote.total_minor * SERVICE_CHARGE_PERCENT) / 100);

  const { data: order, error } = await svc
    .from("orders")
    .insert({
      quotation_id: quote.id,
      enquiry_id: quote.enquiry_id,
      buyer_company_id: buyerCompanyId,
      buyer_profile_id: buyerProfileId,
      supplier_company_id: quote.supplier_company_id,
      status: "awaiting_payment",
      currency: quote.currency,
      total_minor: quote.total_minor,
      commission_rate: SERVICE_CHARGE_PERCENT,
      commission_minor: commissionMinor,
      incoterm: quote.incoterm,
      delivery_country_code: enquiry?.delivery_country_code ?? null,
      delivery_address: enquiry?.delivery_address ?? null,
      created_by: userId,
    })
    .select("id, reference")
    .maybeSingle();

  // One order per quotation, enforced by a unique index. Accepting twice
  // because of a double click returns the order that already exists rather
  // than failing in the buyer's face.
  if (error) {
    const { data: existing } = await svc
      .from("orders")
      .select("id, reference")
      .eq("quotation_id", quote.id)
      .maybeSingle();

    if (existing) return { ok: true as const, order: existing as { id: string; reference: string } };

    console.error("[orders] could not create order", error);
    return { ok: false as const, message: "The order could not be created. Please tell us." };
  }

  return { ok: true as const, order: order as { id: string; reference: string } };
}

/* ------------------------------------------------------------------
   Getting the goods there, and saying they arrived
   ------------------------------------------------------------------ */

/**
 * The supplier moves the order along: in production, shipped, delivered.
 *
 * Both of these go through a database function rather than updating the
 * row from here. The reason is that the rules are about money: a supplier
 * who could write to orders.status could write 'completed' and release
 * their own payout, and a buyer who could write to their own order could
 * change what it cost. supplier_advance_order and buyer_confirm_delivery
 * each change only their own columns and re-check who is calling, which
 * no row policy can express.
 *
 * Called with the user's own session so auth.uid() is set inside the
 * function. The service key would make it null and the check would see an
 * anonymous caller.
 */
export async function advanceOrder(orderId: string, formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const back = (code: string) => redirect(`/account/orders/${orderId}?delivery=${code}`);

  const status = String(formData.get("status") ?? "").trim();
  if (!status) back("steperror");

  const supabase = await sessionClient();
  const { error } = await supabase.rpc("supplier_advance_order", {
    p_order_id: orderId,
    p_status: status,
    p_carrier: String(formData.get("carrier") ?? "").trim() || null,
    p_tracking: String(formData.get("tracking") ?? "").trim() || null,
  });

  if (error) {
    // The codes the function raises, turned into something the page can
    // say. Anything else is logged and shown as a generic failure rather
    // than leaking a Postgres message onto a supplier's screen.
    console.error("[orders] advance failed", error);
    if (error.code === "42501") back("notyours");
    back("steperror");
  }

  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/account/orders");
  back(status === "delivered" ? "delivered" : "moved");
}

/**
 * The buyer confirms the goods arrived.
 *
 * This is the single most consequential button on the platform: it is what
 * releases a supplier's money. It is deliberately the buyer's, and a
 * supplier marking their own delivery complete does not substitute for it.
 */
export async function confirmDelivery(orderId: string): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const back = (code: string) => redirect(`/account/orders/${orderId}?delivery=${code}`);

  const supabase = await sessionClient();
  const { error } = await supabase.rpc("buyer_confirm_delivery", {
    p_order_id: orderId,
  });

  if (error) {
    console.error("[orders] confirmation failed", error);
    if (error.code === "42501") back("notyours");
    back("steperror");
  }

  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/account/orders");
  back("confirmed");
}

/**
 * Raising a dispute.
 *
 * Open to both sides, because the two failures are different and both are
 * real: a buyer who received the wrong goods, and a supplier whose buyer
 * has gone quiet and will not confirm a delivery that plainly happened.
 * Only one of those is the case people think of, and leaving the other
 * out would strand suppliers.
 *
 * Raising one stops the money. An approved payout drops back to pending
 * and nothing is released until an administrator settles it.
 */
export async function raiseDispute(orderId: string, formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const back = (code: string) => redirect(`/account/orders/${orderId}?delivery=${code}`);

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) back("noreason");

  const supabase = await sessionClient();
  const { error } = await supabase.rpc("raise_dispute", {
    p_order_id: orderId,
    p_reason: reason,
  });

  if (error) {
    console.error("[orders] dispute failed", error);
    if (error.code === "42501") back("cannotdispute");
    if (error.code === "23505") back("alreadydisputed");
    back("steperror");
  }

  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/account/orders");
  back("disputed");
}

/* ------------------------------------------------------------------
   The money
   ------------------------------------------------------------------ */

/**
 * Opens a Flutterwave checkout for an order and sends the buyer to it.
 *
 * Redirects on success, so it never returns in the happy case.
 */
export async function startCheckout(orderId: string): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  /**
   * Every exit is a redirect, never a returned value.
   *
   * This is a form action, so React requires it to return nothing. More
   * usefully, it means a buyer always ends up somewhere that explains
   * itself rather than on a page that silently did nothing. The reason
   * travels as a short code and the order page turns it into a sentence,
   * so no error text passes through the URL.
   */
  const back = (code: string) => redirect(`/account/orders/${orderId}?payment=${code}`);

  if (!isFlutterwaveConfigured()) back("notconfigured");

  // Read the order through the buyer's OWN session first. If row level
  // security will not show it to them, they have no business paying for
  // it, and nothing below runs.
  const session = await sessionClient();
  const { data: visible } = await session
    .from("orders")
    .select("id, status, buyer_company_id, buyer_profile_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!visible) back("notfound");

  const seen = visible as {
    id: string;
    status: string;
    buyer_company_id: string | null;
    buyer_profile_id: string | null;
  };

  // A supplier can see the order too, and must not be able to pay for it.
  const isBuyer = seen.buyer_profile_id
    ? seen.buyer_profile_id === user.id
    : Boolean(seen.buyer_company_id);
  if (!isBuyer) back("notbuyer");

  if (seen.status !== "awaiting_payment") back("alreadypaid");

  const svc = serviceClient();

  const { data: full } = await svc
    .from("orders")
    .select("id, reference, quotation_id, supplier_company_id, currency, total_minor")
    .eq("id", orderId)
    .maybeSingle();

  const order = full as {
    id: string;
    reference: string;
    quotation_id: string;
    supplier_company_id: string;
    currency: string;
    total_minor: number;
  };

  // Minor units come from the currencies table rather than being assumed
  // to be 2, because they are not always 2.
  const { data: cur } = await svc
    .from("currencies")
    .select("minor_units")
    .eq("code", order.currency)
    .maybeSingle();
  const minorUnits = (cur as { minor_units: number } | null)?.minor_units ?? 2;

  const { data: supplier } = await svc
    .from("companies")
    .select("trading_name, legal_name, logo_url")
    .eq("id", order.supplier_company_id)
    .maybeSingle();

  const seller = supplier as {
    trading_name: string | null;
    legal_name: string;
    logo_url: string | null;
  } | null;

  // A payment row per attempt. An abandoned checkout stays 'pending'
  // forever and the next attempt gets its own row, so the history shows
  // what really happened rather than one row rewritten three times.
  const { data: payment, error: payErr } = await svc
    .from("payments")
    .insert({
      quotation_id: order.quotation_id,
      order_id: order.id,
      buyer_company_id: seen.buyer_company_id,
      buyer_profile_id: seen.buyer_profile_id,
      supplier_company_id: order.supplier_company_id,
      currency: order.currency,
      amount_minor: order.total_minor,
      provider: "flutterwave",
    })
    .select("id, reference")
    .maybeSingle();

  if (payErr || !payment) {
    console.error("[payments] could not create payment", payErr);
    back("error");
  }

  const pay = payment as { id: string; reference: string };
  const txRef = buildTxRef(pay.reference);

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://afrilynq.co.uk";

  // Declared with the redirect inside the try, so TypeScript can see that
  // nothing after a failure runs. back() redirects, which throws.
  let link = "";
  try {
    link = await createCheckout({
      txRef,
      amountMinor: order.total_minor,
      currency: order.currency,
      minorUnits,
      redirectUrl: `${base}/account/orders/${order.id}/paid`,
      customer: { email: user.email ?? "", name: user.full_name ?? undefined },
      title: `AfriLynq order ${order.reference}`,
      description: `Payment to ${seller?.trading_name || seller?.legal_name || "supplier"}`,
      logoUrl: seller?.logo_url ?? undefined,
      meta: { order_id: order.id, payment_id: pay.id },
    });
  } catch (error) {
    console.error("[flutterwave] checkout failed", error);
    await svc
      .from("payments")
      .update({ status: "failed", failed_reason: "Checkout could not be opened." })
      .eq("id", pay.id);
    // The real reason goes to the logs. The buyer gets a sentence.
    console.error("[flutterwave] reason", flutterwaveMessage(error));
    back("error");
  }

  // No need to store the tx_ref. It is the payment reference plus an HMAC
  // of it, so the webhook recovers the reference from what Flutterwave
  // echoes back and proves we minted it at the same time.

  revalidatePath(`/account/orders/${order.id}`);
  redirect(link);
}
