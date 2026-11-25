"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import { notifyCompany } from "@/lib/notify";
import { formatMinor } from "@/lib/money";
import {
  canMove,
  deliveryConfirmed,
  disputeBlocks,
  ORDER_FOLLOWS,
  ORDER_MOVES_FROM,
} from "@/lib/payout-flow";

/**
 * Moving a payout along.
 *
 * Why the service key and not the administrator's own session, which is
 * what the verification actions use: payouts carries read policies only.
 * stage4-03 deliberately gave nobody write access, because a row in that
 * table is money leaving the company and a signed in user who could
 * update one could pay themselves. So the writes happen with the service
 * key, requireAdmin is the gate, and every change writes an audit_log row
 * naming who did it. The trail lives in the log rather than in the row's
 * own auth context.
 *
 * Nothing here moves any money. These are bookkeeping states. The call
 * that actually sends funds to a supplier is a separate step that needs
 * the provider's transfer API, and it is deliberately not wired to a
 * button that an administrator could press twice.
 */

type Result = { ok: true } | { ok: false; message: string };

async function move(
  payoutId: string,
  to: string,
  extra: Record<string, unknown> = {}
): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "You are not signed in as an administrator." };

  const svc = serviceClient();

  const { data: current, error: readError } = await svc
    .from("payouts")
    .select("id, reference, status, order_id, net_minor, currency, manual, supplier_company_id")
    .eq("id", payoutId)
    .maybeSingle();

  if (readError) return { ok: false, message: readError.message };
  if (!current) return { ok: false, message: "That payout no longer exists." };

  const row = current as unknown as {
    id: string;
    reference: string;
    status: string;
    order_id: string;
    net_minor: number;
    currency: string;
    manual: boolean;
    supplier_company_id: string;
  };

  if (row.status === to) return { ok: true };

  if (!canMove(row.status, to)) {
    return {
      ok: false,
      message: `A payout that is ${row.status} cannot become ${to}.`,
    };
  }

  /**
   * Delivery has to be confirmed before money is released.
   *
   * The page disables the Approve button when it is not, but a disabled
   * button is a courtesy to the person clicking, not a control: the form
   * posts to this action and nothing stops a request that never went near
   * the page. This is the check that actually holds, and it is the single
   * rule the whole payout flow exists to enforce, so it is enforced here.
   */
  if (to === "approved" || to === "paid") {
    const { data: orderRow } = await svc
      .from("orders")
      .select("status, buyer_confirmed_at, dispute_resolved_at")
      .eq("id", row.order_id)
      .maybeSingle();

    const order = orderRow as unknown as {
      status: string;
      buyer_confirmed_at: string | null;
      dispute_resolved_at: string | null;
    } | null;
    const orderStatus = order?.status;

    /**
     * An open dispute stops everything.
     *
     * Checked here and not only on the page, because the page's disabled
     * button is a courtesy and this is the control. A payout released
     * while two parties are still arguing about the goods is the one
     * mistake on this screen that cannot be undone afterwards.
     */
    if (disputeBlocks(order)) {
      return {
        ok: false,
        message:
          "This order is in dispute. Settle the dispute first, which sets the supplier's " +
          "share at the reduced rate and releases it.",
      };
    }

    /**
     * An order that has already been approved or completed has passed this
     * check once and must not be blocked by it now, because approving
     * moves the order off delivered by design. Everything else has to
     * show a confirmed delivery.
     *
     * Marking paid is included deliberately. A payout routed to manual
     * never passes through approved, so gating approval alone left
     * pending, manual, paid as a path that releases money without the
     * buyer ever confirming anything.
     */
    const alreadyCleared =
      orderStatus === "payout_approved" || orderStatus === "completed";

    if (!alreadyCleared && !deliveryConfirmed(order)) {
      return {
        ok: false,
        message:
          "The buyer has not confirmed this delivery yet, so the supplier's money cannot " +
          "be released.",
      };
    }
  }

  /**
   * A refunded order must never pay its supplier.
   *
   * Refunds and payouts are separate ledgers that both hang off the same
   * order, so nothing in the schema stops an administrator refunding a
   * buyer in the morning and approving the supplier in the afternoon.
   * That is the platform paying twice out of one payment. The check is
   * here, at the point money is released, rather than on the refund,
   * because a refund raised after approval still has to be possible.
   */
  if (to === "approved" || to === "paid") {
    const { data: refunds } = await svc
      .from("refunds")
      .select("amount_minor, status")
      .eq("order_id", row.order_id);

    const returned = ((refunds ?? []) as { amount_minor: number; status: string }[])
      .filter((r) => r.status === "completed")
      .reduce((n, r) => n + r.amount_minor, 0);

    if (returned > 0) {
      return {
        ok: false,
        message:
          "This order has been refunded to the buyer. Releasing it to the supplier as well " +
          "would pay out twice. Handle it as a dispute instead.",
      };
    }
  }

  const patch: Record<string, unknown> = { status: to, ...extra };
  if (to === "approved") {
    patch.approved_at = new Date().toISOString();
    patch.approved_by = admin.id;
    patch.failed_reason = null;
  }
  if (to === "processing") patch.sent_at = new Date().toISOString();
  if (to === "paid") {
    patch.paid_at = new Date().toISOString();
    patch.failed_reason = null;
  }
  if (to === "manual") patch.manual = true;

  const { error } = await svc.from("payouts").update(patch).eq("id", payoutId);
  if (error) return { ok: false, message: error.message };

  /**
   * The order moves with it, but only forward.
   *
   * A paid payout whose order is already completed must not be dragged
   * back, and an order a buyer has since disputed must not be quietly
   * marked complete. So the update is conditional on the order still
   * being in a state this transition is entitled to move.
   */
  const next = ORDER_FOLLOWS[to];
  if (next && row.order_id) {
    const from = ORDER_MOVES_FROM[next] ?? [];
    if (from.length > 0) {
      await svc
        .from("orders")
        .update({ status: next })
        .eq("id", row.order_id)
        .in("status", [...from]);
    }
  }

  await svc.from("audit_log").insert({
    actor_id: admin.id,
    actor_email: admin.email,
    action: `payout.${to}`,
    entity_type: "payout",
    entity_id: payoutId,
    before_state: { status: row.status },
    after_state: {
      status: to,
      reference: row.reference,
      net_minor: row.net_minor,
      currency: row.currency,
      ...extra,
    },
  });

  /**
   * The supplier hears the two things they care about: that it has been
   * cleared, and that it has gone. Nothing is sent for the intermediate
   * states, which are AfriLynq's bookkeeping and not their business.
   */
  const money = formatMinor(row.net_minor, row.currency);
  if (to === "approved") {
    await notifyCompany(row.supplier_company_id, {
      kind: "payout_approved",
      title: `Your payment of ${money} has been approved`,
      body:
        `Payment ${row.reference} for ${money} has been approved for release.\n\n` +
        "It will reach the account you gave us shortly. Nothing further is needed " +
        "from you.",
      linkPath: "/account/payouts",
      linkLabel: "See your payments",
    });
  } else if (to === "paid") {
    await notifyCompany(row.supplier_company_id, {
      kind: "payout_paid",
      title: `${money} has been sent to you`,
      body:
        `Payment ${row.reference} for ${money} has been sent to the account you gave ` +
        "us.\n\nDepending on your bank it may take a day or two to appear. If it has " +
        "not arrived after three working days, email info@afrilynq.co.uk with this " +
        "reference.",
      linkPath: "/account/payouts",
      linkLabel: "See your payments",
    });
  }

  revalidatePath("/admin/payouts");
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Each of these is bound to a row and used as a form action, so it returns
 * void. A refusal is not silent: it is written to the audit log and the
 * row simply does not move, which the page then shows.
 */

export async function approvePayout(payoutId: string): Promise<void> {
  await move(payoutId, "approved");
}

export async function markPayoutSent(payoutId: string): Promise<void> {
  await move(payoutId, "processing");
}

export async function markPayoutPaid(payoutId: string): Promise<void> {
  await move(payoutId, "paid");
}

/**
 * No provider can reach this supplier's country, so it is settled outside
 * the platform and recorded here. Zambia and Togo are both live on
 * AfriLynq today and neither can be paid automatically, so this is not an
 * edge case, it is Tuesday.
 */
export async function markPayoutManual(payoutId: string): Promise<void> {
  await move(payoutId, "manual");
}

export async function markPayoutFailed(payoutId: string, formData: FormData): Promise<void> {
  const reason = String(formData.get("reason") ?? "").trim();
  await move(payoutId, "failed", {
    failed_reason: reason || "No reason recorded",
  });
}

/** A free text note against a payout, for anything the states cannot say. */
export async function notePayout(payoutId: string, formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;

  const note = String(formData.get("note") ?? "").trim();
  if (!note) return;

  const svc = serviceClient();
  await svc.from("payouts").update({ notes: note }).eq("id", payoutId);
  await svc.from("audit_log").insert({
    actor_id: admin.id,
    actor_email: admin.email,
    action: "payout.note",
    entity_type: "payout",
    entity_id: payoutId,
    after_state: { note },
  });

  revalidatePath("/admin/payouts");
}
