"use client";

import { useState, useTransition } from "react";

/**
 * Accept or decline, with the decline reason asked for rather than
 * optional.
 *
 * A supplier told only "no" learns nothing and quotes the same way next
 * time. A supplier told "the price is fine but we need it three weeks
 * earlier" can quote again usefully, which is the whole point of
 * keeping the negotiation on the platform.
 *
 * Accepting opens a confirmation step too. It is a commercial
 * commitment, and a button that does that on one click beside a button
 * that does the opposite is a mis-click waiting to happen.
 */

type Result = { ok: boolean; message?: string };

export default function QuotationDecision({
  accept,
  decline,
}: {
  accept: (formData: FormData) => Promise<Result>;
  decline: (formData: FormData) => Promise<Result>;
}) {
  const [mode, setMode] = useState<null | "accept" | "decline">(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(action: (fd: FormData) => Promise<Result>) {
    return (formData: FormData) => {
      setError(null);
      start(async () => {
        const result = await action(formData);
        if (!result?.ok) setError(result?.message ?? "That did not work.");
        else setMode(null);
      });
    };
  }

  if (mode === null) {
    return (
      <div className="rounded-xl border border-sand-deep bg-paper p-6 shadow-sm">
        <h2 className="text-xl">Your answer</h2>
        <p className="mt-1.5 leading-relaxed text-ink-soft">
          Accepting tells the supplier to proceed on these terms. It does not
          take any payment.
        </p>
        {error && (
          <p className="mt-4 rounded-lg border-l-2 border-gold bg-sand px-4 py-3 text-ink">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setMode("accept")}
            className="btn-lift btn-primary"
          >
            Accept this quotation
          </button>
          <button
            type="button"
            onClick={() => setMode("decline")}
            className="btn-lift btn-ghost"
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  const accepting = mode === "accept";

  return (
    <div className="rounded-xl border border-sand-deep bg-paper p-6 shadow-sm">
      <h2 className="text-xl">{accepting ? "Accept this quotation" : "Decline this quotation"}</h2>

      <form action={submit(accepting ? accept : decline)} className="mt-4">
        {accepting ? (
          <p className="leading-relaxed text-ink-soft">
            The supplier will be told you have accepted, and the terms on this
            quotation become the agreed terms. Payment and delivery are
            arranged between you directly for now.
          </p>
        ) : (
          <label className="block">
            <span className="block text-xs font-semibold tracking-wide text-stone uppercase">
              Why, briefly
            </span>
            <textarea
              name="reason"
              rows={3}
              required
              placeholder="Price works but we need delivery before the end of the month."
              className="mt-1.5 w-full rounded-lg border border-sand-deep bg-paper px-3.5 py-2.5 text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
            <span className="mt-1.5 block text-xs text-stone">
              The supplier sees this. It is how they know whether to quote again.
            </span>
          </label>
        )}

        {error && (
          <p className="mt-4 rounded-lg border-l-2 border-gold bg-sand px-4 py-3 text-ink">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className="btn-lift btn-primary">
            {pending ? "Sending" : accepting ? "Yes, accept it" : "Send decline"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(null);
              setError(null);
            }}
            className="link-quiet text-ink-soft"
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
