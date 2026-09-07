"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginForm() {
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
      // Deliberately vague. Saying which half was wrong tells an attacker
      // which email addresses have accounts.
      setError("That email and password combination was not recognised.");
      setBusy(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  const field =
    "mt-2 w-full rounded-lg bg-white/[0.05] px-4 py-3 text-white ring-1 ring-white/12 outline-none transition-shadow placeholder:text-white/30 focus:ring-2 focus:ring-gold";

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block">
        <span className="text-[0.72rem] font-semibold tracking-widest text-white/55 uppercase">
          Email address
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="your@email.com"
          className={field}
        />
      </label>

      <label className="block">
        <span className="text-[0.72rem] font-semibold tracking-widest text-white/55 uppercase">
          Password
        </span>
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
            className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 p-1 text-white/40 transition-colors hover:text-white"
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
        <p className="rounded border-l-2 border-[#C2453F] bg-[#C2453F]/10 px-4 py-3 text-sm text-white/85">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-forest-soft py-3.5 font-medium text-white transition-colors hover:bg-gold hover:text-[#042115] disabled:opacity-60"
      >
        {busy ? "Signing in" : "Sign in"}
        {!busy && <span aria-hidden="true">&rarr;</span>}
      </button>
    </form>
  );
}
