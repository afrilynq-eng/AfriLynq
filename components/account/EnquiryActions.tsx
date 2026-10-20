"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { declineEnquiry } from "@/app/(site)/account/enquiries/actions";

/**
 * The three buttons on an enquiry, plus the buyer's contact details.
 *
 * Send quotation and Message are Stage 3 and are inert rather than
 * pointing at pages that do not exist. Decline is real, and asks for a
 * reason first: a buyer who is turned down with no word assumes the
 * supplier is unreliable, and the reason is usually "wrong season" or
 * "below our minimum", either of which is worth them knowing.
 *
 * Contact details sit behind a click rather than on the card. They are on
 * screen only when somebody has chosen to look, which keeps a screenshot
 * of this page from being a list of buyer email addresses.
 */
export default function EnquiryActions({
  enquiryId,
  open,
  contactEmail,
  contactPhone,
}: {
  enquiryId: string;
  open: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showing, setShowing] = useState(false);

  async function decline() {
    setBusy(true);
    setError("");
    const result = await declineEnquiry(enquiryId, reason).catch(() => ({
      ok: false as const,
      message: "Could not reach the server. Try again.",
    }));
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    setAsking(false);
    router.refresh();
  }

  const ghost =
    "rounded-lg border border-sand-deep px-4 py-2.5 text-sm font-medium text-forest transition-colors hover:border-forest disabled:opacity-40";
  const dead =
    "cursor-not-allowed rounded-lg border border-sand-deep px-4 py-2.5 text-sm font-medium text-stone";

  if (asking) {
    return (
      <div className="mt-4 rounded-lg border border-sand-deep bg-sand/60 p-4">
        <label htmlFor={`reason-${enquiryId}`} className="text-sm font-medium text-ink">
          Why are you declining? The buyer sees this.
        </label>
        <input
          id={`reason-${enquiryId}`}
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
          placeholder="Out of season until October, or below our minimum order"
          className="mt-2 w-full rounded-lg border border-sand-deep bg-paper px-4 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={decline}
            disabled={busy}
            className="rounded-lg bg-[#8c3b2c] px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            {busy ? "Sending" : "Decline this enquiry"}
          </button>
          <button type="button" onClick={() => setAsking(false)} className={ghost}>
            Keep it open
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-[#8c3b2c]">{error}</p>}
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled
          title="The quotation builder arrives in Stage 3"
          className="cursor-not-allowed rounded-lg bg-forest/35 px-5 py-2.5 text-sm font-semibold text-paper"
        >
          Send quotation
        </button>
        <button type="button" disabled title="Messaging arrives in Stage 3" className={dead}>
          Message
        </button>
        {open && (
          <button type="button" onClick={() => setAsking(true)} className={ghost}>
            Decline
          </button>
        )}
        {(contactEmail || contactPhone) && (
          <button
            type="button"
            onClick={() => setShowing((v) => !v)}
            className={ghost + " ml-auto"}
          >
            {showing ? "Hide contact" : "Show contact"}
          </button>
        )}
      </div>

      {showing && (
        <div className="mt-3 rounded-lg border border-sand-deep bg-sand/60 px-4 py-3 text-sm">
          <p className="text-stone">
            Until the quotation builder arrives, reply to this buyer directly.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
            {contactEmail && (
              <span className="text-ink">
                <span className="text-stone">Email </span>
                {contactEmail}
              </span>
            )}
            {contactPhone && (
              <span className="text-ink">
                <span className="text-stone">Phone </span>
                {contactPhone}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
