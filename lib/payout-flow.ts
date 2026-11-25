/**
 * What a payout is allowed to do next.
 *
 * This lived in two places for about an hour: the server action enforced
 * it, and the page decided which buttons to draw from its own copy. Two
 * copies of a rule about releasing money is one copy too many, because
 * the day they disagree is the day a button appears that the action then
 * refuses, or worse, the reverse. One table, both readers.
 */

export type PayoutStatus =
  | "pending"
  | "approved"
  | "processing"
  | "paid"
  | "failed"
  | "manual";

export type PayoutStep = "approve" | "sent" | "paid" | "manual" | "failed";

/** The status each step moves a payout to. */
export const STEP_TARGET: Record<PayoutStep, PayoutStatus> = {
  approve: "approved",
  sent: "processing",
  paid: "paid",
  manual: "manual",
  failed: "failed",
};

/**
 * From each status, which steps are offered.
 *
 * paid is terminal on purpose. Money that has reached a supplier is not
 * un-sent by changing a dropdown, and a mistake there is a refund or a
 * conversation, not an edit.
 */
export const STEPS_FROM: Record<PayoutStatus, readonly PayoutStep[]> = {
  pending: ["approve", "manual"],
  approved: ["sent", "paid", "manual", "failed"],
  processing: ["paid", "failed"],
  manual: ["paid", "failed"],
  failed: ["approve", "manual"],
  paid: [],
};

export function stepsFrom(status: string): readonly PayoutStep[] {
  return STEPS_FROM[status as PayoutStatus] ?? [];
}

/** Whether a status may move directly to another. Derived, never duplicated. */
export function canMove(from: string, to: string): boolean {
  return stepsFrom(from).some((step) => STEP_TARGET[step] === to);
}

/**
 * The order status that follows a payout status, where there is one.
 *
 * A payout and its order are two halves of the same fact, and letting them
 * drift is how a supplier ends up paid against an order that still says it
 * is waiting.
 */
export const ORDER_FOLLOWS: Record<string, string> = {
  approved: "payout_approved",
  paid: "completed",
};

/**
 * Which order statuses a payout transition is entitled to move.
 *
 * Approval only advances an order that is genuinely in flight, so an order
 * already completed is not dragged backwards and one in dispute is not
 * quietly marked done.
 */
export const ORDER_MOVES_FROM: Record<string, readonly string[]> = {
  payout_approved: ["delivered", "shipped", "in_transit", "confirmed", "in_production"],
  completed: ["payout_approved"],
};

/**
 * A payout may only be approved once the BUYER has confirmed the goods
 * arrived. This is the rule Collins set and the reason the whole screen
 * exists, so it is stated once, here, rather than inferred from a status
 * comparison scattered through the page.
 *
 * It reads buyer_confirmed_at and deliberately not the status. An order
 * reaches delivered when the SUPPLIER says it arrived, which is a claim
 * about their own payment and not a confirmation of anything. Gating on
 * the status would have let a supplier release their own money by ticking
 * a box, which is precisely the exposure the escrow exists to remove.
 */
export function deliveryConfirmed(
  order: { buyer_confirmed_at?: string | null } | null | undefined
): boolean {
  return Boolean(order?.buyer_confirmed_at);
}
