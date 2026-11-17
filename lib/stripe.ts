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
 * Countries confirmed against Stripe's own documentation.
 *
 * Deliberately short. A long list assembled from memory would block a
 * supplier in a country Stripe does support, which is a worse failure
 * than a warning we did not show. Anything not named here is treated as
 * unknown: we let the supplier try, and Stripe decides.
 *
 * Checked 17 November 2026. Worth rechecking when a new source country
 * is added, because Stripe adds countries and rarely removes them.
 */
const SUPPORTED = new Set([
  // Africa, where our suppliers are
  "NG", "ZA", "KE", "GH",
  // Where our buyers are, and where AfriLynq itself is registered
  "GB", "IE", "NL", "DE", "FR", "BE", "ES", "IT", "PT", "PL", "US", "CA", "AE",
]);

/**
 * Countries Stripe does not support for connected accounts.
 *
 * Both of these are live on the platform: Mulomba K Fisheries is in Ndola,
 * Zambia, and we have a grower in Togo. They can sell on AfriLynq and be
 * quoted and paid; they cannot be paid THROUGH Stripe, which is a
 * different sentence and needs saying plainly rather than as a Stripe
 * error code.
 */
const UNSUPPORTED = new Set(["ZM", "TG"]);

export type PayoutSupport = "supported" | "unsupported" | "unknown";

export function payoutSupport(countryCode: string | null): PayoutSupport {
  const code = (countryCode ?? "").toUpperCase();
  if (!code) return "unknown";
  if (UNSUPPORTED.has(code)) return "unsupported";
  if (SUPPORTED.has(code)) return "supported";
  return "unknown";
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
  return "Something went wrong setting up payouts. Nothing has been changed. Please try again, and email info@afrilynq.co.uk if it keeps happening.";
}
