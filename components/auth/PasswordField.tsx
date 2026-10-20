"use client";

import { useId, useState } from "react";

/**
 * Password with a show and hide eye, a strength bar and the rules shown
 * as a checklist that ticks as you type.
 *
 * The rules are listed up front rather than revealed by failing. A person
 * who is told "at least 10 characters with a symbol" before they start
 * types one password; a person told afterwards types three.
 */

export const PASSWORD_RULES = [
  { id: "length", label: "At least 10 characters", test: (v: string) => v.length >= 10 },
  { id: "upper", label: "An uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower", label: "A lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { id: "number", label: "A number", test: (v: string) => /\d/.test(v) },
  {
    id: "symbol",
    label: "A symbol, for example ! @ # £",
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
];

/** Shared with the server so both sides judge a password the same way. */
export function passwordProblems(value: string): string[] {
  return PASSWORD_RULES.filter((r) => !r.test(value)).map((r) => r.label);
}

const STRENGTH = [
  { label: "Too short", bar: "w-1/5 bg-[#c2453f]", text: "text-[#8c3b2c]" },
  { label: "Weak", bar: "w-2/5 bg-[#c2453f]", text: "text-[#8c3b2c]" },
  { label: "Fair", bar: "w-3/5 bg-gold", text: "text-gold-deep" },
  { label: "Good", bar: "w-4/5 bg-gold", text: "text-gold-deep" },
  { label: "Strong", bar: "w-full bg-forest", text: "text-forest" },
];

function Eye({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M1.8 10S4.9 4.6 10 4.6 18.2 10 18.2 10 15.1 15.4 10 15.4 1.8 10 1.8 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.5" />
      {!open && (
        <path d="M3.5 16.5 16.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

function Tick({ on }: { on: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={"h-4 w-4 shrink-0 " + (on ? "text-forest" : "text-sand-deep")}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const field =
  "mt-2 w-full rounded-lg border border-sand-deep bg-paper py-3 pr-12 pl-4 text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30";

export default function PasswordField({
  name,
  label,
  value,
  onChange,
  autoComplete = "new-password",
  /** Show the strength bar and the rule checklist. Off for the confirm box. */
  showRules = false,
  /** What to say underneath, for the confirm box. */
  note,
  noteTone = "quiet",
}: {
  name: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  autoComplete?: string;
  showRules?: boolean;
  note?: string;
  noteTone?: "quiet" | "good" | "bad";
}) {
  const id = useId();
  const [shown, setShown] = useState(false);

  const passed = PASSWORD_RULES.filter((r) => r.test(value)).length;
  const strength = STRENGTH[Math.max(0, passed - 1)];

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[0.7rem] font-semibold tracking-widest text-forest uppercase"
      >
        {label} <span className="text-gold">*</span>
      </label>

      <div className="relative">
        <input
          id={id}
          name={name}
          type={shown ? "text" : "password"}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={field}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-3 mt-1 -translate-y-1/2 rounded p-1 text-stone transition-colors hover:text-forest"
        >
          <Eye open={shown} />
        </button>
      </div>

      {showRules && value.length > 0 && (
        <>
          <div className="mt-2.5 flex items-center gap-3">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand-deep">
              <span className={"block h-full rounded-full transition-all " + strength.bar} />
            </span>
            <span className={"text-xs font-medium " + strength.text}>{strength.label}</span>
          </div>

          <ul className="mt-3 space-y-1.5">
            {PASSWORD_RULES.map((r) => {
              const on = r.test(value);
              return (
                <li
                  key={r.id}
                  className={"flex items-center gap-2 text-sm " + (on ? "text-ink-soft" : "text-stone")}
                >
                  <Tick on={on} />
                  {r.label}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {note && (
        <span
          className={
            "mt-1.5 block text-xs " +
            (noteTone === "good"
              ? "text-forest"
              : noteTone === "bad"
                ? "text-[#8c3b2c]"
                : "text-stone")
          }
        >
          {note}
        </span>
      )}
    </div>
  );
}
