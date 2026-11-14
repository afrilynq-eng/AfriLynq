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
