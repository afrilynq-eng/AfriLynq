"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";

/**
 * The six digit code from the confirmation email.
 *
 * A code rather than the link it replaces. The link only works in the
 * browser that opens the mail, which on a phone is usually not the browser
 * the person signed up in, and they land in a second session with the form
 * they half filled in lost. A code is read on the phone and typed on the
 * laptop.
 *
 * The link still works. The same Supabase email carries both, so anyone
 * who presses it instead is confirmed through /auth/callback as before.
 */

/**
 * How many boxes to draw.
 *
 * Supabase decides how long the code actually is, in Authentication ->
 * Email -> Email OTP Length, and it can be anything from 6 to 10. This
 * page used to hardcode 6. When that setting was moved to 8, every new
 * sign-up broke: the form took the first six digits of an eight digit
 * code, Supabase rejected it, and the person was told to "check the
 * digits" when the digits were fine.
 *
 * So the count is configurable, and more importantly the form no longer
 * assumes it is right. See LONG_MAX below.
 */
const DIGITS = Math.min(10, Math.max(4, Number(process.env.NEXT_PUBLIC_OTP_DIGITS) || 6));

/** The longest code Supabase will ever issue. */
const LONG_MAX = 10;
const RESEND_SECONDS = 60;

/** lae•••@gmail.com — enough to recognise, not enough to read over a shoulder. */
function mask(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return email;
  const name = email.slice(0, at);
  const head = name.slice(0, Math.min(3, name.length));
  return `${head}${"•".repeat(Math.max(3, name.length - head.length))}${email.slice(at)}`;
}

export default function OtpForm({ email }: { email: string }) {
  const router = useRouter();

  const [digits, setDigits] = useState<string[]>(Array(DIGITS).fill(""));
  /**
   * Set when the code in hand is longer than the boxes can hold. Rather
   * than truncate it and fail, the form swaps to a single field holding
   * the whole thing, so a mismatched setting is an inconvenience instead
   * of a wall.
   */
  const [long, setLong] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [left, setLeft] = useState(RESEND_SECONDS);

  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  // One interval for the whole countdown, cleared on unmount so a fast
  // verify does not leave a timer running against a gone component.
  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => setLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [left]);

  useEffect(() => {
    boxes.current[0]?.focus();
  }, []);

  const code = long || digits.join("");
  const enough = long ? long.length >= 6 : code.length >= DIGITS;

  function put(i: number, value: string) {
    const only = value.replace(/\D/g, "");
    if (!only) {
      setDigits((d) => d.map((x, n) => (n === i ? "" : x)));
      return;
    }

    // Work out what the code would become, and whether it runs past the
    // end. Anything past the end is not a typo: it is Supabase issuing a
    // longer code than this build draws boxes for. Keeping it and
    // widening the field beats silently dropping it and blaming the
    // person for "checking the digits".
    const next = [...digits];
    let over = "";
    for (let n = 0; n < only.length; n += 1) {
      if (i + n < DIGITS) next[i + n] = only[n];
      else over += only[n];
    }

    if (over) {
      setLong((next.join("") + over).slice(0, LONG_MAX));
      setError("");
      return;
    }

    setDigits(next);
    const land = Math.min(i + only.length, DIGITS - 1);
    boxes.current[land]?.focus();
    boxes.current[land]?.select();
  }

  function key(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && digits[i] === "" && i > 0) {
      e.preventDefault();
      setDigits((d) => d.map((x, n) => (n === i - 1 ? "" : x)));
      boxes.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) boxes.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < DIGITS - 1) boxes.current[i + 1]?.focus();
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!enough) {
      setError(`Please type all ${DIGITS} digits.`);
      return;
    }

    setBusy(true);
    setError("");
    setSent("");

    const { error: err } = await browserClient().auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });

    if (err) {
      setBusy(false);
      // Supabase says "Token has expired or is invalid" for both a wrong
      // code and an old one. Saying which would tell someone guessing
      // codes that the address exists, so the one sentence covers both.
      // If the code we sent was not the length this build draws, say so.
      // "Check the digits" is actively misleading when the digits are
      // right and the form is the thing that is wrong.
      setError(
        code.length !== DIGITS
          ? `That code did not work. It is ${code.length} digits long and this page expects ${DIGITS}, so please tell us at info@afrilynq.co.uk. Asking for a new code below may help in the meantime.`
          : "That code did not work. Check the digits, or ask for a new code below."
      );
      setDigits(Array(DIGITS).fill(""));
      setLong("");
      boxes.current[0]?.focus();
      return;
    }

    // verifyOtp signs them in, so the server has to be asked again before
    // /account will see the session.
    router.push("/account");
    router.refresh();
  }

  async function resend() {
    setBusy(true);
    setError("");
    setSent("");

    const { error: err } = await browserClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent("A new code is on its way.");
    setLeft(RESEND_SECONDS);
  }

  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <div className="rounded-xl bg-paper p-7 text-center shadow-lg ring-1 ring-sand-deep sm:p-10">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest/8 text-forest">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
          <rect
            x="2.75"
            y="5"
            width="18.5"
            height="14"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="m3.5 6.5 7.3 5.6a2 2 0 0 0 2.4 0l7.3-5.6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </span>

      <h1 className="mt-5 text-2xl font-semibold text-forest">Check your email</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        {/* Do not claim a length once we know it was wrong. */}
        We sent {long ? "a code" : `a ${DIGITS}-digit code`} to{" "}
        <span className="font-medium text-ink">{mask(email)}</span>. It expires in
        10 minutes.
      </p>

      <form onSubmit={verify} className="mt-7">
        {long ? (
          <div>
            <label htmlFor="otp-long" className="sr-only">
              Your code
            </label>
            <input
              id="otp-long"
              value={long}
              onChange={(e) =>
                setLong(e.target.value.replace(/\D/g, "").slice(0, LONG_MAX))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              className="w-full rounded-lg border border-sand-deep bg-paper px-4 py-4 text-center text-2xl font-semibold tracking-[0.3em] text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
            <p className="mt-2 text-xs leading-relaxed text-stone">
              That code is longer than this page expected, so we have put it in
              one box. It should still work.
            </p>
          </div>
        ) : (
        <div className="flex justify-center gap-2 sm:gap-3">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                boxes.current[i] = el;
              }}
              value={d}
              onChange={(e) => put(i, e.target.value)}
              onKeyDown={(e) => key(i, e)}
              onFocus={(e) => e.currentTarget.select()}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={LONG_MAX}
              aria-label={`Digit ${i + 1}`}
              className="h-14 w-11 rounded-lg border border-sand-deep bg-paper text-center text-xl font-semibold text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30 sm:h-16 sm:w-13"
            />
          ))}
        </div>
        )}

        {error && (
          <p className="mt-5 rounded-lg border-l-2 border-gold bg-sand px-4 py-3 text-left text-sm text-ink">
            {error}
          </p>
        )}
        {sent && (
          <p className="mt-5 rounded-lg border-l-2 border-forest bg-forest/5 px-4 py-3 text-left text-sm text-ink">
            {sent}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !enough}
          className="btn-lift mt-6 w-full rounded-lg bg-forest py-4 font-medium text-paper transition-colors hover:bg-gold hover:text-forest-deep disabled:opacity-50"
        >
          {busy ? "Checking" : "Verify email"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        {left > 0 ? (
          <>Did not get it? Resend code in {clock}</>
        ) : (
          <>
            Did not get it?{" "}
            <button
              type="button"
              onClick={resend}
              disabled={busy}
              className="link-quiet font-medium text-forest disabled:opacity-60"
            >
              Resend code
            </button>
          </>
        )}
      </p>

      <p className="mt-2 text-sm text-ink-soft">
        Wrong address?{" "}
        <Link href="/sign-up" className="link-quiet font-medium text-forest">
          Change email
        </Link>
      </p>

      <p className="mt-7 border-t border-sand-deep pt-5 text-xs leading-relaxed text-stone">
        Nothing yet? Look in your spam or junk folder for a message from
        noreply@afrilynq.co.uk, and mark it as safe so you get the rest of our
        emails.
      </p>
    </div>
  );
}
