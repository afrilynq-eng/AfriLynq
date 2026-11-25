import { serviceClient } from "@/lib/supabase";
import { notifyBuyer, notifyCompany } from "@/lib/notify";
import { formatMinor } from "@/lib/money";
import { verifyTransaction } from "@/lib/flutterwave";

/**
 * Writes down what Flutterwave says actually happened.
 *
 * Exported because the return page calls it too. A buyer coming back from
 * checkout should not have to wait for a webhook to see their own order
 * updated, and the webhook should not be the only path, because webhooks
 * get lost. Both routes land here, and running it twice is harmless.
 */
export async function settlePayment(paymentReference: string, transactionId: string) {
  const svc = serviceClient();

  const { data: row } = await svc
    .from("payments")
    .select("id, order_id, status, currency, amount_minor")
    .eq("reference", paymentReference)
    .maybeSingle();

  if (!row) {
    console.warn("[flutterwave] no payment for reference", paymentReference);
    return;
  }

  const payment = row as {
    id: string;
    order_id: string | null;
    status: string;
    currency: string;
    amount_minor: number;
  };

  // Already settled. The webhook arriving three times, which it does, must
  // not advance the order three times or pay anybody twice.
  if (payment.status === "successful") return;

  const { data: cur } = await svc
    .from("currencies")
    .select("minor_units")
    .eq("code", payment.currency)
    .maybeSingle();
  const minorUnits = (cur as { minor_units: number } | null)?.minor_units ?? 2;

  const verified = await verifyTransaction(transactionId, minorUnits);

  /**
   * The checks that stop a cheap attack.
   *
   * Someone who knows a tx_ref could otherwise pay one pound for a two
   * thousand pound order, or pay in a currency worth a fraction of the
   * one agreed. Flutterwave's own documentation says to compare both, and
   * it is the step most integrations skip.
   */
  const amountMatches = verified.amountMinor === payment.amount_minor;
  const currencyMatches = verified.currency === payment.currency;

  if (verified.status !== "successful" || !amountMatches || !currencyMatches) {
    const why =
      verified.status !== "successful"
        ? `Flutterwave reports ${verified.status}.`
        : !currencyMatches
          ? `Paid in ${verified.currency}, expected ${payment.currency}.`
          : `Paid ${verified.amountMinor}, expected ${payment.amount_minor}.`;

    await svc
      .from("payments")
      .update({
        status: verified.status === "successful" ? "failed" : verified.status,
        failed_reason: why,
        provider_tx_id: verified.providerTxId,
        provider_payload: verified.raw as Record<string, unknown>,
      })
      .eq("id", payment.id);

    console.warn("[flutterwave] payment refused", paymentReference, why);
    return;
  }

  await svc
    .from("payments")
    .update({
      status: "successful",
      provider_tx_id: verified.providerTxId,
      settled_minor: verified.settledMinor,
      provider_fee_minor: verified.feeMinor,
      payment_method: verified.paymentMethod,
      verified_at: new Date().toISOString(),
      provider_payload: verified.raw as Record<string, unknown>,
    })
    .eq("id", payment.id);

  if (!payment.order_id) return;

  // Only move an order that is still waiting. If a supplier has already
  // marked it dispatched, a late webhook must not drag it backwards.
  await svc
    .from("orders")
    .update({ status: "confirmed" })
    .eq("id", payment.order_id)
    .eq("status", "awaiting_payment");

  // The payout is created here, owed and unapproved. It is what makes the
  // money visible to a supplier the moment it is paid, and it is what the
  // admin payout list reads. Nothing is released until delivery is
  // confirmed.
  const { data: order } = await svc
    .from("orders")
    .select(
      "id, reference, supplier_company_id, buyer_company_id, buyer_profile_id, " +
        "currency, total_minor, commission_rate, commission_minor"
    )
    .eq("id", payment.order_id)
    .maybeSingle();

  if (!order) return;
  const o = order as unknown as {
    id: string;
    reference: string;
    supplier_company_id: string;
    buyer_company_id: string | null;
    buyer_profile_id: string | null;
    currency: string;
    total_minor: number;
    commission_rate: number | null;
    commission_minor: number | null;
  };

  const commission = o.commission_minor ?? 0;

  await svc.from("payouts").upsert(
    {
      order_id: o.id,
      supplier_company_id: o.supplier_company_id,
      status: "pending",
      currency: o.currency,
      gross_minor: o.total_minor,
      commission_rate: o.commission_rate ?? 0,
      commission_minor: commission,
      net_minor: o.total_minor - commission,
    },
    { onConflict: "order_id", ignoreDuplicates: true }
  );

  /**
   * Both sides are told, and the supplier's message is the one that
   * matters: it is their cue to start preparing, and until now the only
   * way they learned a buyer had paid was by logging in and looking.
   *
   * After the payout upsert on purpose. If notifying fails the money is
   * already correctly recorded, which is the right way round.
   */
  const money = formatMinor(payment.amount_minor, payment.currency);

  await Promise.all([
    notifyBuyer(o, {
      kind: "payment_received",
      title: `Payment received for ${o.reference}`,
      body:
        `We have received your payment of ${money} for order ${o.reference}.\n\n` +
        "AfriLynq is holding it until you confirm the goods have arrived. The supplier " +
        "has been told and will begin preparing your order.",
      linkPath: `/account/orders/${o.id}`,
      linkLabel: "View your order",
    }),
    notifyCompany(o.supplier_company_id, {
      kind: "order_paid",
      title: `${o.reference} has been paid for`,
      body:
        `The buyer has paid ${money} for order ${o.reference}, and AfriLynq is holding it.\n\n` +
        "You can begin preparing the order. Mark it dispatched when it leaves you, and " +
        "your payment is released once the buyer confirms it arrived.",
      linkPath: `/account/orders/${o.id}`,
      linkLabel: "Open the order",
    }),
  ]);
}
