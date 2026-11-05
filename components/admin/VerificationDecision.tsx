"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  decideCompany,
  type Decision,
  type CheckKey,
  type CheckValue,
} from "@/app/admin/verification/actions";

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
/**
 * The four checks the public site promises on every supplier. They are
 * named here in the same words the home page and the retailers page use,
 * so an administrator is ticking the promise rather than a paraphrase of
 * it.
 */
const CHECKS: { key: CheckKey; label: string; hint: string }[] = [
  {
    key: "registration",
    label: "Business registration",
    hint: "Registered in the country of origin",
  },
  {
    key: "exports",
    label: "Evidence of export shipments",
    hint: "Previous shipments, or the licences to make one",
  },
  {
    key: "certificates",
    label: "Certificates and expiry",
    hint: "On file, with expiry dates checked",
  },
  {
    key: "contact",
    label: "Named, accountable contact",
    hint: "One person a buyer can reach",
  },
];

export default function VerificationDecision({
  companyId,
  documents,
  current = "pending",
  checks: saved,
}: {
  companyId: string;
  documents: number;
  /** The company's verification_status right now. */
  current?: string;
  /** What was recorded last time, if this company has been decided before. */
  checks?: Partial<Record<CheckKey, CheckValue>> | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "busy" | Decision>("idle");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [checks, setChecks] = useState<Partial<Record<CheckKey, CheckValue>>>(
    saved ?? {}
  );

  const asking = mode === "rejected" || mode === "suspended";

  function setCheck(key: CheckKey, value: CheckValue) {
    setChecks((prev) => ({
      ...prev,
      // Pressing the same answer again clears it, so a mis-click is one
      // press to undo rather than a wrong record.
      [key]: prev[key] === value ? undefined : value,
    }));
  }

  async function decide(decision: Decision) {
    setMode("busy");
    setError("");

    const result = await decideCompany(companyId, decision, notes, checks).catch(
      () => ({
        ok: false as const,
        message: "Could not reach the server. Try again.",
      })
    );

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
          placeholder="Registration certificate is illegible. Upload a clearer scan showing the registration number."
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
  const answered = CHECKS.filter((c) => checks[c.key]).length;

  return (
    <div className="mt-5 border-t border-white/8 pt-4">
      {/* The four checks. Recorded against the company and written to the
          audit log with the decision, because the public site promises
          these four by name and until now nothing evidenced them. */}
      <div className="mb-5">
        <p className="text-[0.7rem] font-semibold tracking-widest text-white/45 uppercase">
          Checks shown on the supplier badge
          <span className="ml-2 font-normal tracking-normal text-white/30 normal-case">
            {answered} of {CHECKS.length} answered
          </span>
        </p>

        <ul className="mt-2.5 space-y-1.5">
          {CHECKS.map((c) => {
            const v = checks[c.key];
            return (
              <li
                key={c.key}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded bg-white/[0.03] px-3.5 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block text-sm text-white/85">{c.label}</span>
                  <span className="block text-xs text-white/35">{c.hint}</span>
                </span>

                <span className="flex shrink-0 items-center gap-1.5">
                  {(["pass", "fail", "na"] as CheckValue[]).map((val) => {
                    const on = v === val;
                    const label = val === "na" ? "N/A" : val === "pass" ? "Pass" : "Fail";
                    const tone = on
                      ? val === "pass"
                        ? "bg-[#2FA36B] text-white"
                        : val === "fail"
                          ? "bg-[#C2453F] text-white"
                          : "bg-white/25 text-white"
                      : "bg-white/8 text-white/55 hover:bg-white/14";
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCheck(c.key, val)}
                        aria-pressed={on}
                        className={
                          "rounded px-3 py-1.5 text-xs font-medium transition-colors " + tone
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </span>
              </li>
            );
          })}
        </ul>

        {answered < CHECKS.length && (
          <p className="mt-2 text-xs text-white/35">
            You can decide without answering all four. What you do answer is
            recorded against the company and in the audit log.
          </p>
        )}
      </div>

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
