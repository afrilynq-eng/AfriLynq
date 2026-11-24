/**
 * Money is stored in minor units, which is the only way to store it.
 *
 * Every amount on a quotation is a bigint of the smallest unit of its
 * currency: 1250 in GBP is twelve pounds fifty. Floating point pounds
 * would quietly lose a penny somewhere between a line total and an
 * invoice, and the first time anybody notices is when a supplier says
 * they were underpaid.
 *
 * The scale is per currency and is not always two. It is read from the
 * currencies table rather than assumed here.
 */

export function formatMinor(
  minor: number | null | undefined,
  currency: string,
  minorUnits = 2
): string {
  const value = (minor ?? 0) / 10 ** minorUnits;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: minorUnits,
      maximumFractionDigits: minorUnits,
    }).format(value);
  } catch {
    // An unknown or non-ISO currency code: show the code rather than
    // throwing, because a quotation that will not render is worse than
    // one with a plain prefix.
    return `${currency} ${value.toLocaleString("en-GB", {
      minimumFractionDigits: minorUnits,
      maximumFractionDigits: minorUnits,
    })}`;
  }
}

/** A quantity, without the trailing zeros a numeric(14,3) carries. */
export function formatQuantity(q: number | string | null | undefined): string {
  const n = typeof q === "string" ? Number(q) : (q ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-GB", { maximumFractionDigits: 3 });
}

export const QUOTATION_STATUS: Record<string, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-sand text-stone" },
  sent: { label: "Awaiting your answer", tone: "bg-gold/20 text-gold" },
  accepted: { label: "Accepted", tone: "bg-forest/15 text-forest" },
  rejected: { label: "Not accepted", tone: "bg-[#C2453F]/15 text-[#A3352F]" },
  expired: { label: "Expired", tone: "bg-sand text-stone" },
  withdrawn: { label: "Withdrawn", tone: "bg-sand text-stone" },
  superseded: { label: "Superseded", tone: "bg-sand text-stone" },
};

/**
 * The seven order statuses, in the words Collins set out in his brief
 * of 24 November, mapped onto the enum the database actually holds.
 *
 * Five of them predate the payment work under different names, which is
 * why the keys and the labels do not match: changing the enum would have
 * meant rewriting every existing order. The label is what a person reads
 * and the key is what the database stores, and this is the one place the
 * two are tied together.
 */
export const ORDER_STATUS: Record<string, { label: string; tone: string }> = {
  awaiting_payment: { label: "Awaiting payment", tone: "bg-gold/20 text-gold" },
  confirmed: { label: "Payment confirmed", tone: "bg-forest/15 text-forest" },
  in_production: { label: "Processing order", tone: "bg-forest/15 text-forest" },
  shipped: { label: "Dispatched", tone: "bg-forest/15 text-forest" },
  in_transit: { label: "In transit", tone: "bg-forest/15 text-forest" },
  delivered: { label: "Delivered, awaiting confirmation", tone: "bg-gold/20 text-gold" },
  payout_approved: { label: "Payout approved", tone: "bg-forest/15 text-forest" },
  completed: { label: "Supplier paid", tone: "bg-forest/15 text-forest" },
  disputed: { label: "In dispute", tone: "bg-[#C2453F]/15 text-[#A3352F]" },
  cancelled: { label: "Cancelled", tone: "bg-sand text-stone" },
};

/** What a supplier keeps after the service charge, in minor units. */
export function netOfCommission(totalMinor: number, commissionMinor: number | null) {
  return totalMinor - (commissionMinor ?? 0);
}
