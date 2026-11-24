import { createHmac, timingSafeEqual } from "crypto";

/**
 * Flutterwave, server side only.
 *
 * This module reads the secret key, so it must never be imported into a
 * client component. Nothing here is exposed to the browser.
 *
 * Why v3 and not v4
 * -----------------
 * I recommended v4 on 23 November and was wrong, so the reasoning is
 * written down here rather than left to be rediscovered.
 *
 * The Stripe lesson was that a new integration should not be built on an
 * old API version, because Stripe had closed v1 to new platforms.
 * Flutterwave is the opposite case. Their own announcement calls v4 a
 * PUBLIC BETA, says they are "still refining the experience", and states
 * there are "no plans to deprecate v3". A client's live payment rail does
 * not belong on a beta API.
 *
 * The second reason is Collins's own brief. He asked for hosted checkout:
 * the buyer leaves AfriLynq, pays on Flutterwave's page, and comes back.
 * That is exactly what v3 Standard does. The v4 equivalent is an
 * orchestrated direct charge, where our own code handles encrypted card
 * fields, PIN entry and OTP prompts. That is more work, a worse buyer
 * experience on a first version, and it puts card handling closer to us
 * than it needs to be.
 *
 * If Flutterwave take v4 to general availability and add a hosted
 * checkout, moving is a day's work because everything below is behind
 * these functions.
 */

const API = "https://api.flutterwave.com/v3";

export function isFlutterwaveConfigured() {
  return Boolean(process.env.FLUTTERWAVE_SECRET_KEY);
}

/** True while we are on test keys. Used to label the screen, not to branch logic. */
export function isTestMode() {
  return (process.env.FLUTTERWAVE_SECRET_KEY ?? "").includes("_TEST");
}

function secretKey() {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) throw new Error("Flutterwave is not configured. Set FLUTTERWAVE_SECRET_KEY.");
  return key;
}

/* ------------------------------------------------------------------
   Money
   ------------------------------------------------------------------ */

/**
 * Everything in the database is stored in minor units as a bigint, which
 * is the only way to hold money without rounding drift. Flutterwave wants
 * major units. This is the single place that conversion happens.
 *
 * minorUnits comes from the currencies table rather than being assumed to
 * be 2, because it is not always 2.
 */
export function toMajor(amountMinor: number, minorUnits: number): string {
  return (amountMinor / 10 ** minorUnits).toFixed(minorUnits);
}

export function toMinor(amountMajor: number, minorUnits: number): number {
  return Math.round(amountMajor * 10 ** minorUnits);
}

/* ------------------------------------------------------------------
   Talking to Flutterwave
   ------------------------------------------------------------------ */

type FlwResponse<T> = { status: string; message: string; data: T };

async function call<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown } = { method: "GET" }
): Promise<FlwResponse<T>> {
  const res = await fetch(`${API}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    // Money calls are never served from a cache.
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as FlwResponse<T> | null;

  if (!res.ok || !json || json.status !== "success") {
    const message = json?.message ?? `Flutterwave returned ${res.status}`;
    throw new FlutterwaveError(message, res.status, json);
  }

  return json;
}

export class FlutterwaveError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly payload: unknown
  ) {
    super(message);
    this.name = "FlutterwaveError";
  }
}

/* ------------------------------------------------------------------
   Taking a payment
   ------------------------------------------------------------------ */

export type CheckoutRequest = {
  /** Our own reference, from the payments table. Flutterwave echoes it back. */
  txRef: string;
  amountMinor: number;
  currency: string;
  minorUnits: number;
  /** Where the buyer lands afterwards. Must be absolute. */
  redirectUrl: string;
  customer: { email: string; name?: string; phone?: string };
  /** Shown on Flutterwave's page so the buyer knows what they are paying for. */
  title: string;
  description?: string;
  logoUrl?: string;
  /** Carried through to the webhook, so it can find the order without a lookup. */
  meta?: Record<string, string>;
};

/**
 * Creates the hosted checkout and returns the link to send the buyer to.
 *
 * Nothing is confirmed by this call. It only opens a door.
 */
export async function createCheckout(req: CheckoutRequest): Promise<string> {
  const { data } = await call<{ link: string }>("/payments", {
    method: "POST",
    body: {
      tx_ref: req.txRef,
      amount: toMajor(req.amountMinor, req.minorUnits),
      currency: req.currency,
      redirect_url: req.redirectUrl,
      customer: {
        email: req.customer.email,
        name: req.customer.name,
        phonenumber: req.customer.phone,
      },
      customizations: {
        title: req.title,
        description: req.description,
        logo: req.logoUrl,
      },
      meta: req.meta,
    },
  });

  return data.link;
}

export type VerifiedPayment = {
  providerTxId: string;
  txRef: string;
  status: "successful" | "failed" | "pending";
  /** What the buyer was charged, in minor units of the currency below. */
  amountMinor: number;
  currency: string;
  /** What reached the merchant balance after Flutterwave's cut. */
  settledMinor: number | null;
  feeMinor: number | null;
  paymentMethod: string | null;
  raw: unknown;
};

/**
 * Asks Flutterwave what really happened.
 *
 * This is the only thing allowed to mark a payment successful. A buyer
 * landing on the success URL proves nothing at all: that URL is just a
 * link, and anyone can type it. Every path into the payments table goes
 * through here first.
 */
export async function verifyTransaction(
  transactionId: string,
  minorUnits: number
): Promise<VerifiedPayment> {
  const { data } = await call<{
    id: number;
    tx_ref: string;
    status: string;
    amount: number;
    currency: string;
    amount_settled?: number;
    app_fee?: number;
    payment_type?: string;
  }>(`/transactions/${encodeURIComponent(transactionId)}/verify`);

  return {
    providerTxId: String(data.id),
    txRef: data.tx_ref,
    status:
      data.status === "successful"
        ? "successful"
        : data.status === "pending"
          ? "pending"
          : "failed",
    amountMinor: toMinor(data.amount, minorUnits),
    currency: data.currency,
    settledMinor:
      typeof data.amount_settled === "number"
        ? toMinor(data.amount_settled, minorUnits)
        : null,
    feeMinor: typeof data.app_fee === "number" ? toMinor(data.app_fee, minorUnits) : null,
    paymentMethod: data.payment_type ?? null,
    raw: data,
  };
}

/* ------------------------------------------------------------------
   Webhooks
   ------------------------------------------------------------------ */

/**
 * Checks that a webhook really came from Flutterwave.
 *
 * Flutterwave does not sign the body. It sends back, in a verif-hash
 * header, the exact secret hash that was typed into the dashboard. So
 * this is a shared password comparison rather than a signature check,
 * which is weaker than Stripe's scheme and worth knowing: it proves the
 * sender knows the secret, not that the body is untampered.
 *
 * That is why the webhook verifies every payment against the API before
 * believing a figure in it. The header decides whether to listen. The
 * verify call decides what is true.
 *
 * Compared in constant time so the comparison cannot be used to guess the
 * hash one character at a time.
 */
export function verifyWebhookHash(headerValue: string | null): boolean {
  const expected = process.env.FLUTTERWAVE_SECRET_HASH;
  if (!expected || !headerValue) return false;

  const a = Buffer.from(headerValue);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

/**
 * A reference nobody can guess or collide with.
 *
 * Flutterwave requires tx_ref to be unique across the account forever. The
 * payments table reference (PAY-26-01234) is unique but predictable, and a
 * predictable reference in a URL invites somebody to go looking at other
 * people's. The suffix removes that without losing the readable part.
 */
export function buildTxRef(paymentReference: string): string {
  const salt = process.env.FLUTTERWAVE_SECRET_HASH ?? "afrilynq";
  const digest = createHmac("sha256", salt).update(paymentReference).digest("hex").slice(0, 10);
  return `${paymentReference}-${digest}`;
}

/**
 * Reads a tx_ref back, and refuses one we did not mint.
 *
 * The suffix is an HMAC of the reference under our own secret, so this
 * both recovers the payment reference and proves the whole string came
 * from us. That means no column is needed to remember which tx_ref
 * belonged to which payment, and a webhook quoting an invented reference
 * is rejected before it touches the database.
 *
 * Returns null for anything that does not check out.
 */
export function parseTxRef(txRef: string | null | undefined): string | null {
  if (!txRef) return null;

  const cut = txRef.lastIndexOf("-");
  if (cut <= 0) return null;

  const reference = txRef.slice(0, cut);
  // Rebuild it and compare the whole string, so a tampered reference and a
  // tampered digest both fail the same way.
  return buildTxRef(reference) === txRef ? reference : null;
}

/* ------------------------------------------------------------------
   Errors a buyer or supplier might see
   ------------------------------------------------------------------ */

/** Turns a Flutterwave error into something a person can act on. */
export function flutterwaveMessage(error: unknown): string {
  const e = error as FlutterwaveError;

  if (e?.httpStatus === 401 || e?.httpStatus === 403) {
    return "Payments are not set up on AfriLynq's side yet. This is our problem, not yours. Please try again later.";
  }
  if (e?.httpStatus === 429) {
    return "The payment provider is busy. Please wait a moment and try again.";
  }
  if (isTestMode() && e?.message) {
    return `Test mode detail: ${e.message}`;
  }
  if (e?.message) {
    return `The payment could not be started: ${e.message}`;
  }
  return "Something went wrong starting the payment. Nothing has been charged. Please try again, and email info@afrilynq.co.uk if it keeps happening.";
}
