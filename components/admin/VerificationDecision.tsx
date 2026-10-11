"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { decideCompany, type Decision } from "@/app/admin/verification/actions";

/**
 * Approve, reject or suspend, with the reason attached.
 *
 * Approve goes in one press. Anything else opens the note first, because
 * the note is the whole value of a negative decision: it is what the
 * supplier reads and acts on, and without one you get an email asking
 * what was wrong.
 *
 * Which buttons show depends on where the company already is. A verified
 * company does not need approving again, and suspending one that was
 * never verified is meaningless.
 */
export default function VerificationDecision({
  companyId,
  documents,
  current = "pending",
}: {
  companyId: string;
  documents: number;
  /** The company's verification_status right now. */
  current?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "busy" | Decision>("idle");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const asking = mode === "rejected" || mode === "suspended";

  async function decide(decision: Decision) {
    setMode("busy");
    setError("");

    const result = await decideCompany(companyId, decision, notes).catch(() => ({
      ok: false as const,
      message: "Could not reach the server. Try again.",
    }));

    if (!result.ok) {
      setMode(decision === "verified" ? "idle" : decision);
      setError(result.message);
      return;
    }

    setNotes("");
    setMode("idle");
    router.refresh();
  }

  const quiet =
    "rounded bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/16 disabled:opacity-40";

  if (asking) {
    const verb = mode === "suspended" ? "Suspend" : "Send rejection";
    return (
      <div className="mt-5 border-t border-white/8 pt-4">
        <label
          htmlFor={`notes-${companyId}`}
          className="block text-[0.7rem] font-semibold tracking-widest text-white/45 uppercase"
        >
          Why
        </label>
        <textarea
          id={`notes-${companyId}`}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Certificate of incorporation is illegible. Upload a clearer scan showing the RC number."
          className="mt-2 w-full rounded bg-white/[0.06] px-3.5 py-2.5 text-sm text-white ring-1 ring-white/10 placeholder:text-white/30"
        />
        <p className="mt-1.5 text-xs text-white/35">
          The supplier sees this word for word on their documents page.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => decide(mode)}
            disabled={!notes.trim()}
            className="rounded bg-[#C2453F] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {verb}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("idle");
              setError("");
            }}
            className={quiet}
          >
            Cancel
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded border-l-2 border-gold bg-white/[0.04] px-4 py-2.5 text-sm text-white/80">
            {error}
          </p>
        )}
      </div>
    );
  }

  const busy = mode === "busy";

  return (
    <div className="mt-5 border-t border-white/8 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        {current !== "verified" && (
          <button
            type="button"
            onClick={() => decide("verified")}
            disabled={busy || documents === 0}
            className="rounded bg-[#2FA36B] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Working" : "Approve and list"}
          </button>
        )}

        {current === "verified" ? (
          <button
            type="button"
            onClick={() => setMode("suspended")}
            disabled={busy}
            className={quiet}
          >
            Suspend
          </button>
        ) : (
          current !== "rejected" && (
            <button
              type="button"
              onClick={() => setMode("rejected")}
              disabled={busy}
              className={quiet}
            >
              Reject
            </button>
          )
        )}

        {current === "verified" && (
          <span className="text-xs text-white/40">
            Suspending takes the company and all its listings off the site
          </span>
        )}

        {documents === 0 && current !== "verified" && (
          <span className="text-xs text-white/40">
            Nothing uploaded, so there is nothing to approve on
          </span>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded border-l-2 border-gold bg-white/[0.04] px-4 py-2.5 text-sm text-white/80">
          {error}
        </p>
      )}
    </div>
  );
}
