import Stripe from "stripe";

/**
 * The Stripe client, server side only.
 *
 * This module reads the secret key, so it must never be imported into a
 * client component. The browser gets the publishable key through
 * NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and nothing else.
 *
 * The API version is not pinned here on purpose. The installed SDK pins
 * it already, and setting it by hand means every library upgrade needs a
 * matching edit or the types stop agreeing with the requests.
 */

let client: Stripe | null = null;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripe(): Stripe {
  if (client) return client;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }

  client = new Stripe(key, {
    // Shows up in the Stripe dashboard's logs, which is the difference
    // between debugging a failed payout and guessing at one.
    appInfo: { name: "AfriLynq", url: "https://afrilynq.co.uk" },
  });

  return client;
}

/** True while we are on test keys. Used to label the screen, not to branch logic. */
export function isTestMode() {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}

/* ------------------------------------------------------------------
   Where Stripe will and will not pay out
   ------------------------------------------------------------------ */

/**
 * Everywhere Stripe will move money for a UK platform.
 *
 * This list is not a judgement call and it is not ours. Stripe's
 * cross-border payouts documentation says it in one sentence:
 *
 *   "Platforms based in the US, UK, EEA, Canada, or Switzerland can
 *   transfer funds to connected accounts in any of those regions.
 *   Stripe doesn't support self-serve cross-border payouts to countries
 *   outside the listed regions."
 *
 * AfriLynq Limited is registered in Liverpool, so that is the whole of
 * it: the EEA, the UK, the US, Canada and Switzerland. No African
 * country appears, Nigeria included.
 *
 * An earlier version of this file listed NG, ZA, KE and GH as supported.
 * That was wrong, and wrong in an expensive way. It came from Stripe's
 * list of countries where a BUSINESS can open a Stripe account to take
 * payments, which is a different question from whether a UK platform can
 * send that business money. Stripe answered the real question with
 * "stripe_transfers is currently unavailable in NG for your platform".
 *
 * Stripe's other product, Global Payouts, reaches further and does cover
 * Kenya, South Africa, Tanzania, Rwanda and Senegal. It does not cover
 * Nigeria, Zambia, Togo or Ghana either, and it requires Treasury and a
 * money transmission licence AfriLynq does not hold.
 *
 * So suppliers outside this list get paid another way, and the platform
 * says so plainly on their payouts page rather than letting them walk
 * into a Stripe error.
 *
 * Checked 17 November 2026 against Stripe's cross-border payouts and
 * Global Payouts documentation.
 */
const STRIPE_PAYS = new Set([
  // The platform's own country, and the rest of the UK and Switzerland
  "GB", "CH",
  // North America
  "US", "CA",
  // EEA: the EU 27
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
  // EEA: the three non-EU members
  "IS", "LI", "NO",
]);

export type PayoutSupport = "supported" | "unsupported" | "unknown";

/**
 * Whether Stripe will pay a supplier in this country.
 *
 * There is no "unknown" answer any more. Stripe's rule is a closed list,
 * not a growing one, so a country that is not on it is a country we
 * cannot pay through Stripe, and saying so up front is kinder than
 * letting someone fill in an identity form that ends in a refusal.
 */
export function payoutSupport(countryCode: string | null): PayoutSupport {
  const code = (countryCode ?? "").toUpperCase();
  if (!code) return "unknown";
  return STRIPE_PAYS.has(code) ? "supported" : "unsupported";
}

/**
 * Turns a Stripe error into something a farmer in Bori can act on.
 *
 * Stripe's messages are written for developers. "Invalid country" tells a
 * supplier nothing about what to do next, and showing them a raw error is
 * how a platform loses a seller on their first attempt.
 */
export function stripeMessage(error: unknown): string {
  const e = error as { type?: string; code?: string; message?: string; param?: string };

  if (e?.code === "account_country_invalid_address" || e?.param === "country") {
    return "Stripe cannot yet pay out to businesses registered in this country. Email info@afrilynq.co.uk and we will arrange payment another way.";
  }
  if (e?.type === "StripeAuthenticationError") {
    return "Payouts are not set up on AfriLynq's side yet. This is our problem, not yours. Please try again later.";
  }
  if (e?.type === "StripeConnectionError" || e?.type === "StripeAPIError") {
    return "Stripe did not respond. Nothing has been changed. Please try again in a few minutes.";
  }
  if (e?.type === "StripeInvalidRequestError" && e?.message) {
    return `Stripe would not accept that: ${e.message}`;
  }

  /**
   * In test mode, say what actually happened.
   *
   * A supplier must never be shown a Stripe error code, which is why the
   * line below exists at all. But while we are building, that same line
   * means every failure costs a trip to the hosting logs. Test keys are
   * only ever in front of us, so the real words are safe there and save
   * an hour across a day of this.
   */
  if (isTestMode()) {
    const detail = [e?.type, e?.code, e?.param, e?.message].filter(Boolean).join(" | ");
    return `Test mode detail: ${detail || String(error)}`;
  }

  return "Something went wrong setting up payouts. Nothing has been changed. Please try again, and email info@afrilynq.co.uk if it keeps happening.";
}
