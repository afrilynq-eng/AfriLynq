"use client";

import { useState, useTransition } from "react";
import { changePassword } from "@/app/(site)/account/settings/actions";

/**
 * Changing your password.
 *
 * Asked for in the 15 November review: there was nowhere to do it short of
 * signing out and using Forgotten password, which is a poor answer for
 * somebody who simply wants to rotate it.
 *
 * The eye toggle is the same one on the sign in form. Somebody typing a
 * new password twice, carefully, deserves to be able to see it.
 */

const label = "block text-sm font-medium text-ink";
const field =
  "mt-1.5 w-full rounded-lg border border-sand-deep bg-paper px-4 py-2.5 text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30";

function Eye({ shown }: { shown: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      {shown && (
        <path d="M4 20 20 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}

export default function PasswordForm() {
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm"
      action={(formData) => {
        setError("");
        setDone(false);

        const currentPassword = String(formData.get("currentPassword") ?? "");
        const newPassword = String(formData.get("newPassword") ?? "");
        const confirm = String(formData.get("confirmPassword") ?? "");

        if (newPassword !== confirm) {
          setError("The two new passwords do not match.");
          return;
        }

        start(async () => {
          const result = await changePassword({ currentPassword, newPassword });
          if (result.ok) {
            setDone(true);
            // Clearing by hand rather than form.reset(), so the browser's
            // password manager sees the fields empty and does not offer to
            // save the old one back.
            document
              .querySelectorAll<HTMLInputElement>("input[data-pw]")
              .forEach((el) => (el.value = ""));
          } else {
            setError(result.message);
          }
        });
      }}
    >
      <h2 className="text-xl">Password</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
        Change it whenever you like. You will stay signed in here.
      </p>

      <div className="mt-5 grid max-w-xl gap-5">
        <label>
          <span className={label}>Current password</span>
          <input
            type={show ? "text" : "password"}
            name="currentPassword"
            data-pw
            required
            autoComplete="current-password"
            className={field}
          />
        </label>

        <label>
          <span className={label}>New password</span>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              name="newPassword"
              data-pw
              required
              minLength={8}
              autoComplete="new-password"
              className={field + " pr-12"}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide passwords" : "Show passwords"}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-stone transition-colors hover:text-forest"
            >
              <Eye shown={show} />
            </button>
          </div>
          <span className="mt-1.5 block text-xs text-stone">At least 8 characters.</span>
        </label>

        <label>
          <span className={label}>New password again</span>
          <input
            type={show ? "text" : "password"}
            name="confirmPassword"
            data-pw
            required
            minLength={8}
            autoComplete="new-password"
            className={field}
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 max-w-xl rounded-lg border-l-2 border-gold bg-sand px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}

      {done && (
        <p className="mt-4 max-w-xl rounded-lg border-l-2 border-forest bg-forest/5 px-4 py-3 text-sm text-ink">
          Password changed.
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-lift btn-primary mt-5">
        {pending ? "Changing" : "Change password"}
      </button>
    </form>
  );
}
