"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { decideCompany, type Decision } from "@/app/admin/verification/actions";

/**
 * Approve or reject, with the reason attached.
 *
 * Approve goes in one press. Reject opens the note first, because the note
 * is the whole value of a rejection: it is what the supplier reads and acts
 * on, and a rejection without one guarantees an email asking what was
 * wrong.
 */
export default function VerificationDecision({
  companyId,
  documents,
}: {
  companyId: string;
  documents: number;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "rejecting" | "busy">("idle");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  async function decide(decision: Decision) {
    setMode("busy");
    setError("");

    const result = await decideCompany(companyId, decision, notes).catch(() => ({
      ok: false as const,
      message: "Could not reach the server. Try again.",
    }));

    if (!result.ok) {
      setMode(decision === "rejected" ? "rejecting" : "idle");
      setError(result.message);
      return;
    }

    setNotes("");
    setMode("idle");
    router.refresh();
  }

  return (
    <div className="mt-5 border-t border-white/8 pt-4">
      {mode === "rejecting" ? (
        <div>
          <label
            htmlFor={`notes-${companyId}`}
            className="block text-[0.7rem] font-semibold tracking-widest text-white/45 uppercase"
          >
            Why not
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
              onClick={() => decide("rejected")}
              disabled={!notes.trim()}
              className="rounded bg-[#C2453F] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send rejection
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("idle");
                setError("");
              }}
              className="rounded bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/16"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => decide("verified")}
            disabled={mode === "busy" || documents === 0}
            className="rounded bg-[#2FA36B] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mode === "busy" ? "Working" : "Approve and list"}
          </button>
          <button
            type="button"
            onClick={() => setMode("rejecting")}
            disabled={mode === "busy"}
            className="rounded bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/16 disabled:opacity-40"
          >
            Reject
          </button>
          {documents === 0 && (
            <span className="text-xs text-white/40">
              Nothing uploaded, so there is nothing to approve on
            </span>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 rounded border-l-2 border-gold bg-white/[0.04] px-4 py-2.5 text-sm text-white/80">
          {error}
        </p>
      )}
    </div>
  );
}
