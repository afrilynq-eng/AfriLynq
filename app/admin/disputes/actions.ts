"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, sessionClient } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import { notifyBuyer, notifyCompany } from "@/lib/notify";
import { formatMinor } from "@/lib/money";

/**
 * Settling a dispute.
 *
 * The whole calculation lives in resolve_dispute in the database rather
 * than here, and that is deliberate. Settling one touches four tables at
 * once: the dispute, a refund to the buyer, the supplier's payout at the
 * reduced rate, and the order's gate. Done from here that is four round
 * trips with no transaction around them, and a failure halfway leaves a
 * buyer refunded while the supplier is still owed the full amount.
 *
 * It runs through the administrator's own session, not the service key,
 * because the function checks app.is_platform_admin() and that check is
 * worth keeping. The service key would walk straight past it.
 */

const back = (id: string, code: string) =>
  redirect(`/admin/disputes?settled=${code}&id=${id}`);

/** A typed amount to minor units, refusing anything that is not money. */
function toMinor(input: string, scale: number): number | null {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 10 ** scale);
}

export async function resolveDispute(
  disputeId: string,
  formData: FormData
): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const svc = serviceClient();

  // The currency's own scale, because a refund typed as 400 means 40000
  // minor units in sterling and 400 in a currency with no decimal places.
  const { data: disputeRow } = await svc
    .from("disputes")
    .select("id, reference, order_id, payment_id, status")
    .eq("id", disputeId)
    .maybeSingle();

  const dispute = disputeRow as unknown as {
    id: string;
    reference: string;
    order_id: string;
    payment_id: string | null;
    status: string;
  } | null;

  if (!dispute) back(disputeId, "notfound");
  if (dispute!.status !== "open") back(disputeId, "already");

  const { data: orderRow } = await svc
    .from("orders")
    .select("currency")
    .eq("id", dispute!.order_id)
    .maybeSingle();

  const currency = (orderRow as { currency: string } | null)?.currency ?? "GBP";
  const { data: currencyRow } = await svc
    .from("currencies")
    .select("minor_units")
    .eq("code", currency)
    .maybeSingle();
  const scale = (currencyRow as { minor_units: number } | null)?.minor_units ?? 2;

  const refund = toMinor(String(formData.get("refund") ?? ""), scale);
  if (refund === null) back(disputeId, "badamount");

  const note = String(formData.get("note") ?? "").trim();

  const supabase = await sessionClient();
  const { error } = await supabase.rpc("resolve_dispute", {
    p_dispute_id: disputeId,
    p_refund_minor: refund,
    p_note: note || null,
  });

  if (error) {
    console.error("[disputes] resolve failed", error);
    back(disputeId, error.code === "42501" ? "notadmin" : "error");
  }

  await svc.from("audit_log").insert({
    actor_id: admin.id,
    actor_email: admin.email,
    action: "dispute.resolved",
    entity_type: "dispute",
    entity_id: disputeId,
    after_state: {
      reference: dispute!.reference,
      refund_minor: refund,
      currency,
      note: note || null,
    },
  });

  /**
   * Both sides are told, and each is told their own half. A buyer does
   * not need the supplier's net figure and a supplier does not need the
   * buyer's refund, so neither is sent the other's number.
   */
  const { data: settledRow } = await svc
    .from("disputes")
    .select("reference, refund_minor, release_minor, commission_minor, currency, resolution_note")
    .eq("id", disputeId)
    .maybeSingle();

  const settled = settledRow as unknown as {
    reference: string;
    refund_minor: number;
    release_minor: number;
    commission_minor: number;
    currency: string;
    resolution_note: string | null;
  } | null;

  const { data: fullOrder } = await svc
    .from("orders")
    .select("id, reference, supplier_company_id, buyer_company_id, buyer_profile_id")
    .eq("id", dispute!.order_id)
    .maybeSingle();

  const order = fullOrder as unknown as {
    id: string;
    reference: string;
    supplier_company_id: string;
    buyer_company_id: string | null;
    buyer_profile_id: string | null;
  } | null;

  if (settled && order) {
    const because = settled.resolution_note
      ? `\n\nWhat was decided: ${settled.resolution_note}`
      : "";

    await Promise.all([
      notifyBuyer(order, {
        kind: "dispute_resolved",
        title: `The dispute on ${order.reference} has been settled`,
        body:
          (settled.refund_minor > 0
            ? `${formatMinor(settled.refund_minor, settled.currency)} is being refunded to you.`
            : "No refund is due on this order.") +
          because +
          "\n\nThe refund returns the way you paid and may take a few days to appear.",
        linkPath: `/account/orders/${order.id}`,
        linkLabel: "View the order",
      }),
      notifyCompany(order.supplier_company_id, {
        kind: "dispute_resolved",
        title: `The dispute on ${order.reference} has been settled`,
        body:
          (settled.release_minor > 0
            ? `${formatMinor(settled.release_minor - settled.commission_minor, settled.currency)} ` +
              "has been released to you, after the reduced service charge that applies " +
              "when an order is disputed."
            : "No payment is due on this order, as it has been refunded in full.") +
          because,
        linkPath: "/account/payouts",
        linkLabel: "See your payments",
      }),
    ]);
  }

  revalidatePath("/admin/disputes");
  revalidatePath("/admin/payouts");
  revalidatePath("/admin/refunds");
  revalidatePath("/admin");
  back(disputeId, "ok");
}
