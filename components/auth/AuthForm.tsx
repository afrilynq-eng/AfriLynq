"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { browserClient } from "@/lib/supabase-browser";

type Mode = "sign-up" | "sign-in";

const COPY: Record<
  Mode,
  {
    band: string;
    bandSub: string;
    action: string;
    switchText: string;
    switchLink: string;
    switchHref: string;
  }
> = {
  "sign-up": {
    band: "Create your account",
    bandSub: "Free. One account, whether you supply or buy",
    action: "Create account",
    switchText: "Already have an account?",
    switchLink: "Sign in",
    switchHref: "/sign-in",
  },
  "sign-in": {
    band: "Sign in",
    bandSub: "Welcome back",
    action: "Sign in",
    switchText: "No account yet?",
    switchLink: "Create one",
    switchHref: "/sign-up",
  },
};

/**
 * Sign up and sign in.
 *
 * One component with a mode, matching how RegisterForm handles its three
 * audiences, so the two forms cannot drift apart in styling.
 *
 * There is no supplier or buyer choice here on purpose. platform_role is only
 * user or admin; whether someone supplies or buys is a property of their
 * company, not of them. A trader who does both would otherwise need two
 * accounts.
 */
export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const copy = COPY[mode];

  const [state, setState] = useState<"idle" | "sending" | "check-email">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const fullName = String(data.get("fullName") ?? "").trim();

    setError("");

    if (mode === "sign-up") {
      // Supabase enforces six characters. Eight is the lowest figure worth
      // defending, and catching it here saves a round trip.
      if (password.length < 8) {
        setError("Your password needs to be at least 8 characters.");
        return;
      }
      if (password !== String(data.get("confirmPassword") ?? "")) {
        setError("The two passwords do not match.");
        return;
      }
    }

    setState("sending");
    const supabase = browserClient();

    try {
      if (mode === "sign-up") {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Read by the on_auth_user_created trigger when it builds the
            // profiles row.
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (err) throw err;
        setState("check-email");
        return;
      }

      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) throw err;

      // refresh() so the server components pick up the new session cookie.
      router.push("/account");
      router.refresh();
    } catch (err) {
      setState("idle");
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong on our side. Please try again."
      );
    }
  }

  const label =
    "block text-[0.7rem] font-semibold tracking-widest text-forest uppercase";
  const field =
    "mt-2 w-full rounded-lg border border-sand-deep bg-paper px-4 py-3 text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30";

  if (state === "check-email") {
    return (
      <div className="overflow-hidden rounded-xl bg-paper shadow-lg ring-1 ring-sand-deep">
        <div className="bg-forest px-7 py-6">
          <h1 className="text-xl !text-paper">Check your email</h1>
        </div>
        <div className="px-7 py-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/15">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
              <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="2"
                stroke="var(--color-gold)"
                strokeWidth="1.8"
              />
              <path
                d="M3.5 6.5 12 13l8.5-6.5"
                stroke="var(--color-gold)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <p className="mt-5 text-lg text-ink">
            We have sent you a link to confirm your address.
          </p>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Open it and you will be signed in. If it is not there in a few
            minutes, look in your spam folder.
          </p>
          <Link href="/sign-in" className="btn-lift btn-ghost mt-8 inline-block">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-paper shadow-lg ring-1 ring-sand-deep">
      <div className="bg-forest px-7 py-6">
        <h1 className="text-xl !text-paper">{copy.band}</h1>
        <p className="mt-1 text-sm text-sand-deep">{copy.bandSub}</p>
      </div>

      <form onSubmit={submit} className="px-7 py-7">
        {mode === "sign-up" && (
          <label className="block">
            <span className={label}>
              Full name <span className="text-gold">*</span>
            </span>
            <input
              type="text"
              name="fullName"
              required
              autoComplete="name"
              placeholder="Your full name"
              className={field}
            />
          </label>
        )}

        <label className={mode === "sign-up" ? "mt-5 block" : "block"}>
          <span className={label}>
            Email address <span className="text-gold">*</span>
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

        <label className="mt-5 block">
          <span className={label}>
            Password <span className="text-gold">*</span>
          </span>
          <input
            type="password"
            name="password"
            required
            minLength={mode === "sign-up" ? 8 : undefined}
            autoComplete={
              mode === "sign-up" ? "new-password" : "current-password"
            }
            placeholder={mode === "sign-up" ? "At least 8 characters" : "Your password"}
            className={field}
          />
        </label>

        {mode === "sign-up" && (
          <label className="mt-5 block">
            <span className={label}>
              Confirm password <span className="text-gold">*</span>
            </span>
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Type it again"
              className={field}
            />
          </label>
        )}

        {error && (
          <p className="mt-5 rounded-lg border-l-2 border-gold bg-sand px-4 py-3 text-sm text-ink">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={state === "sending"}
          className="btn-lift mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-forest py-4 font-medium text-paper transition-colors hover:bg-gold hover:text-forest-deep disabled:opacity-60"
        >
          {state === "sending" ? "Please wait" : copy.action}
          {state !== "sending" && <span aria-hidden="true">&rarr;</span>}
        </button>

        <p className="mt-6 text-center text-sm text-ink-soft">
          {copy.switchText}{" "}
          <Link href={copy.switchHref} className="link-quiet text-forest">
            {copy.switchLink}
          </Link>
        </p>

        {mode === "sign-up" && (
          <p className="mt-4 text-center text-xs leading-relaxed text-stone">
            By creating an account you agree to our{" "}
            <Link href="/terms" className="underline">
              terms of use
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline">
              privacy notice
            </Link>
            .
          </p>
        )}
      </form>
    </div>
  );
}
