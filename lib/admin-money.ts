/**
 * Helpers the administration money screens share.
 *
 * The one rule worth stating out loud: AfriLynq takes payment in whatever
 * currency the quotation was agreed in, so a list of payments can hold
 * pounds, euros and dollars at once. Adding those together gives a number
 * that is wrong in every currency. Nothing here ever returns a single
 * total. Every figure comes back grouped by currency and is rendered as
 * one line per currency, which is the only honest way to show it.
 */

import { formatMinor } from "@/lib/money";

/** Currency code to the number of decimal places it actually uses. */
export type MinorUnits = Record<string, number>;

/** Sum an amount column, grouped by the row's own currency. */
export function sumByCurrency<T extends Record<string, unknown>>(
  rows: readonly T[],
  amountKey: keyof T,
  currencyKey: keyof T = "currency" as keyof T
): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of rows) {
    const currency = String(row[currencyKey] ?? "");
    if (!currency) continue;
    const amount = Number(row[amountKey] ?? 0);
    if (!Number.isFinite(amount)) continue;
    out.set(currency, (out.get(currency) ?? 0) + amount);
  }
  return out;
}

/** The same totals as formatted strings, largest first. */
export function formatTotals(
  totals: Map<string, number>,
  units: MinorUnits
): string[] {
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([currency, minor]) => formatMinor(minor, currency, units[currency] ?? 2));
}

/**
 * Read the currency scales once per page.
 *
 * Two decimal places is the common case and not the universal one, and
 * every amount on the platform is stored in minor units, so getting this
 * wrong moves a decimal point rather than rounding a penny.
 */
export async function minorUnitsMap(
  client: { from: (t: string) => { select: (c: string) => PromiseLike<{ data: unknown }> } }
): Promise<MinorUnits> {
  const { data } = await client.from("currencies").select("code, minor_units");
  const out: MinorUnits = {};
  for (const row of (data ?? []) as { code: string; minor_units: number }[]) {
    out[row.code] = row.minor_units;
  }
  return out;
}

/** A short date, for tables where the year is usually obvious. */
export function shortDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Who the buyer is, in one string.
 *
 * A buyer is either a company or a shopper, never both, which is the rule
 * stage3-06 put into the database and stage4-04 carried into orders. The
 * screens have to account for both or a shopper's payment shows up
 * belonging to nobody.
 */
export function buyerName(
  companyId: string | null,
  profileId: string | null,
  companies: Map<string, string>,
  people: Map<string, string>
): string {
  if (companyId) return companies.get(companyId) ?? "Unknown company";
  if (profileId) return people.get(profileId) ?? "A shopper";
  return "Unknown";
}
