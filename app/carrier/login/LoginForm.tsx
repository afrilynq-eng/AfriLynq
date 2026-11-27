"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Carrier sign-in.
 *
 * Signing in only proves who someone is. Whether they are a carrier at all
 * is decided on the server by looking them up in carrier_users, so a buyer
 * who somehow gets this address and enters their own correct password still
 * lands back here with nothing to see.
 */
export default function CarrierLoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const data = new FormData(e.currentTarget);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.signInWithPassword({
      email: String(data.get("email")),
      password: String(data.get("password")),
    });

    if (error) {
      // Vague on purpose. Naming which half was wrong tells someone which
      // email addresses have accounts here.
      setError("That email and password combination was not recognised.");
      setBusy(false);
      return;
    }

    router.push("/carrier");
    router.refresh();
  }

  const field =
    "mt-2 w-full rounded-lg border border-sand-deep bg-sand px-4 py-3 text-ink " +
    "outline-none transition placeholder:text-stone/60 focus:border-forest " +
    "focus:ring-1 focus:ring-forest";

  const label =
    "text-[10px] font-extrabold uppercase tracking-[0.14em] text-stone";

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block">
        <span className={label}>Email address</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="ops@yourcompany.com"
          className={field}
        />
      </label>

      <label className="block">
        <span className={label}>Password</span>
        <span className="relative block">
          <input
            type={visible ? "text" : "password"}
            name="password"
            required
            autoComplete="current-password"
            className={`${field} pr-12`}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 p-1 text-stone transition-colors hover:text-ink"
          >
            <svg viewBox="0 0 22 22" className="h-5 w-5" fill="none" aria-hidden="true">
              <path
                d="M1.6 11S4.9 4.8 11 4.8 20.4 11 20.4 11 17.1 17.2 11 17.2 1.6 11 1.6 11Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="1.5" />
              {!visible && <path d="M3.5 3.5l15 15" stroke="currentColor" strokeWidth="1.5" />}
            </svg>
          </button>
        </span>
      </label>

      {error && (
        <p className="rounded border-l-4 border-[#C2453F] bg-[#C2453F]/10 px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-forest py-3.5 font-semibold text-white transition-colors hover:bg-gold hover:text-[#04281a] disabled:opacity-60"
      >
        {busy ? "Signing in" : "Sign in"}
        {!busy && <span aria-hidden="true">&rarr;</span>}
      </button>
    </form>
  );
}
