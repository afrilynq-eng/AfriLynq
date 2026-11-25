/**
 * Where a supplier's money goes.
 *
 * Two methods, because Africa is not one payments market. A Nigerian
 * supplier has a NUBAN at a named bank. A Zambian one is as likely to
 * want mobile money, and in Togo more so. Forcing everyone through a
 * bank form would quietly exclude the suppliers hardest to pay, which
 * are exactly the ones the platform exists to reach.
 *
 * The bank's own provider code is not asked for here. Flutterwave
 * publishes a code per bank per country and the list needs credentials to
 * fetch, which we do not have yet. So the supplier gives the bank's name,
 * it is stored as typed, and the code is resolved later. Nothing is
 * blocked by that: a payout settled by hand needs only the name, the
 * number and the account holder, and for Zambia and Togo every payout is
 * settled by hand for now.
 */

export type PayoutMethod = "bank" | "mobile_money";

export const METHOD_LABEL: Record<PayoutMethod, string> = {
  bank: "Bank account",
  mobile_money: "Mobile money",
};

export interface PayoutDestination {
  id: string;
  company_id: string;
  method: string;
  country_code: string;
  currency: string;
  bank_name: string | null;
  bank_code: string | null;
  account_number: string | null;
  phone: string | null;
  network: string | null;
  account_name: string;
  is_default: boolean;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Show enough to recognise, not enough to use.
 *
 * A supplier checking they typed it right needs the last few digits; a
 * screen that renders the whole number invites a shoulder. Administrators
 * see the full number on the payouts screen, where they need it to make
 * the transfer.
 */
export function maskAccount(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.length <= 4) return trimmed;
  return `${"•".repeat(Math.min(trimmed.length - 4, 8))}${trimmed.slice(-4)}`;
}

/** One line describing a destination, for a list or a table cell. */
export function describeDestination(d: PayoutDestination, full = false): string {
  if (d.method === "mobile_money") {
    const number = full ? (d.phone ?? "") : maskAccount(d.phone);
    return `${d.network ?? "Mobile money"} ${number}`.trim();
  }
  const number = full ? (d.account_number ?? "") : maskAccount(d.account_number);
  return `${d.bank_name ?? "Bank"} ${number}`.trim();
}

/**
 * What a destination is missing before money can be sent automatically.
 *
 * Returned as sentences rather than a boolean, because "not ready" with no
 * reason is the kind of message that generates an email instead of a fix.
 * An empty array does not promise a transfer will succeed, only that
 * nothing we can check is obviously absent.
 */
export function whatIsMissing(d: PayoutDestination): string[] {
  const gaps: string[] = [];

  if (d.method === "bank") {
    if (!d.bank_name?.trim()) gaps.push("the name of the bank");
    if (!d.account_number?.trim()) gaps.push("the account number");
    if (!d.bank_code?.trim()) {
      gaps.push("the bank's provider code, which AfriLynq fills in, not you");
    }
  } else {
    if (!d.phone?.trim()) gaps.push("the phone number");
    if (!d.network?.trim()) gaps.push("the mobile money network");
  }

  if (!d.account_name?.trim()) gaps.push("the name on the account");
  return gaps;
}

/**
 * Light validation, deliberately.
 *
 * Account number formats differ by country and by bank, and a strict rule
 * written from the two countries I happen to know would reject a valid
 * account somewhere else and leave that supplier unable to be paid with no
 * way to argue. So this refuses only what cannot be an account number
 * anywhere, and warns rather than blocks on the rest.
 */
export function checkAccountNumber(
  value: string,
  countryCode: string
): { ok: boolean; error?: string; warning?: string } {
  const digits = value.replace(/[\s-]/g, "");

  if (!digits) return { ok: false, error: "Enter your account number." };
  if (!/^\d+$/.test(digits)) {
    return { ok: false, error: "An account number should be digits only." };
  }
  if (digits.length < 6 || digits.length > 20) {
    return { ok: false, error: "That does not look like an account number." };
  }

  // A warning, never a refusal. A Nigerian NUBAN is ten digits, but a
  // domiciliary account is not, and refusing one would be wrong.
  if (countryCode?.toUpperCase() === "NG" && digits.length !== 10) {
    return {
      ok: true,
      warning:
        "Most Nigerian account numbers are 10 digits. Check this one before you save it.",
    };
  }

  return { ok: true };
}

export function checkPhone(value: string): { ok: boolean; error?: string } {
  const cleaned = value.replace(/[\s()-]/g, "");
  if (!cleaned) return { ok: false, error: "Enter the phone number." };
  if (!/^\+?\d{7,15}$/.test(cleaned)) {
    return {
      ok: false,
      error: "Enter the number with its country code, for example +260977123456.",
    };
  }
  return { ok: true };
}

/** Digits and a leading plus only, so what is stored is what is dialled. */
export function normalisePhone(value: string): string {
  const cleaned = value.replace(/[\s()-]/g, "");
  return cleaned.startsWith("+") ? cleaned : cleaned;
}

export function normaliseAccountNumber(value: string): string {
  return value.replace(/[\s-]/g, "");
}
