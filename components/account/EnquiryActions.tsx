"use client";

import Link from "next/link";
import { openEnquiryThread } from "@/app/(site)/account/messages/actions";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { declineEnquiry } from "@/app/(site)/account/enquiries/actions";

/**
 * The three buttons on an enquiry.
 *
 * Quote, Message, Decline. Decline asks for a reason first: a buyer who is
 * turned down with no word assumes the supplier is unreliable, and the
 * reason is usually "wrong season" or "below our minimum", either of which
 * is worth them knowing.
 *
 * There is no Show contact button any more. Handing the supplier the
 * buyer's email the moment an enquiry lands invites both of them off the
 * platform, which loses the record of what was agreed and the service
 * charge with it. Contact details are released once an order is confirmed.
 */
export default function EnquiryActions({
  enquiryId,
  open,
}: {
  enquiryId: string;
  open: boolean;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
        {/* Real as of Stage 3. It was a disabled button with a tooltip
            explaining that quoting was not built yet, which is a fair
            thing to show and a poor thing to leave. */}
        <Link
          href={`/account/enquiries/${enquiryId}/quote`}
          className="btn-lift rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-paper"
        >
          Send quotation
        </Link>
        <form action={openEnquiryThread.bind(null, enquiryId)}>
          <button type="submit" className={ghost}>
            Message
          </button>
        </form>
        {open && (
          <button type="button" onClick={() => setAsking(true)} className={ghost}>
            Decline
          </button>
        )}
      </div>
    </>
  );
}
