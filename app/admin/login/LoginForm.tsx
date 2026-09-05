"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
      // Deliberately vague. Telling someone which half was wrong tells an
      // attacker which email addresses have accounts.
      setError("That email and password combination was not recognised.");
      setBusy(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <label className="block">
        <span className="text-sm font-medium text-ink">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="mt-2 w-full border border-sand-deep bg-paper px-3 py-2.5 text-ink"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-ink">Password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="mt-2 w-full border border-sand-deep bg-paper px-3 py-2.5 text-ink"
        />
      </label>

      {error && (
        <p className="border-l-2 border-gold bg-sand px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
        {busy ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
