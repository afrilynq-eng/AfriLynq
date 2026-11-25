"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";

/**
 * Refund management.
 *
 * A refund is raised against a payment, never against an order, because
 * the money has to go back the way it came. Partial refunds are allowed
 * and tracked, so a dispute settled at half value leaves a record of
 * exactly what went back rather than a note in somebody's inbox.
 *
 * Like the payout actions, nothing here moves money. Raising a refund
 * records the decision and what is owed back; sending it is a provider
 * call that comes separately.
 */

/** Minor units from a typed amount, refusing anything that is not money. */
function toMinor(input: string, scale: number): number | null {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 10 ** scale);
}

export async function raiseRefund(paymentId: string, formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;

  const svc = serviceClient();

  const { data: paymentRow } = await svc
    .from("payments")
    .select("id, reference, status, currency, amount_minor, order_id")
    .eq("id", paymentId)
    .maybeSingle();

  if (!paymentRow) return;

  const payment = paymentRow as unknown as {
    id: string;
    reference: string;
    status: string;
    currency: string;
    amount_minor: number;
    order_id: string | null;
  };

  // Only money that actually arrived can go back.
  if (payment.status !== "successful" && payment.status !== "partially_refunded") return;

  const { data: currencyRow } = await svc
    .from("currencies")
    .select("minor_units")
    .eq("code", payment.currency)
    .maybeSingle();
  const scale = (currencyRow as { minor_units: number } | null)?.minor_units ?? 2;

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return;

  const requested = toMinor(String(formData.get("amount") ?? ""), scale);
  if (requested === null) return;

  /**
   * Never refund more than came in.
   *
   * Everything already refunded or in flight counts against the headroom,
   * so two half refunds raised in two tabs cannot add up to more than the
   * payment. The check is here rather than in a constraint because the
   * sum spans rows.
   */
  const { data: existing } = await svc
    .from("refunds")
    .select("amount_minor, status")
    .eq("payment_id", paymentId);

  const committed = ((existing ?? []) as { amount_minor: number; status: string }[])
    .filter((r) => r.status !== "failed")
    .reduce((n, r) => n + r.amount_minor, 0);

  const headroom = payment.amount_minor - committed;
  if (requested > headroom) return;

  await svc.from("refunds").insert({
    payment_id: paymentId,
    order_id: payment.order_id,
    status: "pending",
    currency: payment.currency,
    amount_minor: requested,
    reason,
    created_by: admin.id,
  });

  await svc.from("audit_log").insert({
    actor_id: admin.id,
    actor_email: admin.email,
    action: "refund.raised",
    entity_type: "payment",
    entity_id: paymentId,
    after_state: {
      payment_reference: payment.reference,
      amount_minor: requested,
      currency: payment.currency,
      reason,
    },
  });

  revalidatePath("/admin/refunds");
  revalidatePath("/admin/payments");
}

async function settle(refundId: string, to: "completed" | "failed", reason?: string) {
  const admin = await requireAdmin();
  if (!admin) return;

  const svc = serviceClient();

  const { data: refundRow } = await svc
    .from("refunds")
    .select("id, reference, status, payment_id, amount_minor")
    .eq("id", refundId)
    .maybeSingle();

  if (!refundRow) return;

  const refund = refundRow as unknown as {
    id: string;
    reference: string;
    status: string;
    payment_id: string;
    amount_minor: number;
  };

  if (refund.status !== "pending") return;

  await svc
    .from("refunds")
    .update({
      status: to,
      completed_at: to === "completed" ? new Date().toISOString() : null,
      failed_reason: to === "failed" ? (reason || "No reason recorded") : null,
    })
    .eq("id", refundId);

  /**
   * The payment's own status follows, so that a glance at the transaction
   * history tells the truth without anybody having to cross-reference the
   * refunds table. Only completed refunds count towards it.
   */
  if (to === "completed") {
    const { data: payment } = await svc
      .from("payments")
      .select("amount_minor")
      .eq("id", refund.payment_id)
      .maybeSingle();

    const { data: all } = await svc
      .from("refunds")
      .select("amount_minor, status")
      .eq("payment_id", refund.payment_id);

    const refunded = ((all ?? []) as { amount_minor: number; status: string }[])
      .filter((r) => r.status === "completed")
      .reduce((n, r) => n + r.amount_minor, 0);

    const total = (payment as { amount_minor: number } | null)?.amount_minor ?? 0;

    await svc
      .from("payments")
      .update({ status: refunded >= total ? "refunded" : "partially_refunded" })
      .eq("id", refund.payment_id);
  }

  await svc.from("audit_log").insert({
    actor_id: admin.id,
    actor_email: admin.email,
    action: `refund.${to}`,
    entity_type: "refund",
    entity_id: refundId,
    before_state: { status: refund.status },
    after_state: { status: to, reference: refund.reference, reason: reason ?? null },
  });

  revalidatePath("/admin/refunds");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/payouts");
}

export async function markRefundCompleted(refundId: string): Promise<void> {
  await settle(refundId, "completed");
}

export async function markRefundFailed(refundId: string, formData: FormData): Promise<void> {
  await settle(refundId, "failed", String(formData.get("reason") ?? "").trim());
}
