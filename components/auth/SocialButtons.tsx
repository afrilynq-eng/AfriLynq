"use client";

import { useState } from "react";
import { browserClient } from "@/lib/supabase-browser";

/**
 * Continue with Google, or with Microsoft.
 *
 * Microsoft rather than "Outlook": Outlook, Hotmail and Live are all
 * Microsoft accounts and one button covers them, along with the work
 * accounts most UK buyers sign in with. Provided the Azure app is
 * registered against the 'common' tenant, both personal and work accounts
 * come through here.
 *
 * The logos are loaded from /public/brand rather than drawn inline.
 * Google and Microsoft both publish the exact artwork their guidelines
 * require, and an approximation drawn by hand is both a trademark problem
 * and against the terms of using their sign-in. If an asset is missing the
 * image hides itself and the button still reads correctly, so a missing
 * file is a cosmetic problem and never a broken button.
 */

type Provider = "google" | "azure";

const PROVIDERS: {
  id: Provider;
  label: string;
  logo: string;
  /**
   * Azure returns a token without an email address unless the scopes are
   * asked for by name, and an account on a marketplace with no email
   * address cannot be contacted, which is the whole point of it.
   */
  scopes?: string;
  queryParams?: Record<string, string>;
}[] = [
  {
    id: "google",
    label: "Continue with Google",
    logo: "/brand/google.svg",
    // Without this, anyone already signed into a Google account is pushed
    // straight through it with no chance to pick a different one. On a
    // shared office machine that is somebody else's account.
    queryParams: { prompt: "select_account" },
  },
  {
    id: "azure",
    // Microsoft's branding guidelines permit exactly two labels, "Sign in
    // with Microsoft" and the short "Sign in". "Continue with Microsoft"
    // is not among them, so the wording differs from the Google button on
    // purpose. Google's own guidelines do allow "Continue with Google".
    label: "Sign in with Microsoft",
    logo: "/brand/microsoft.svg",
    scopes: "openid profile email",
  },
];

export default function SocialButtons({
  next = "/account",
  divider = "after",
}: {
  /** Where to land after the provider sends the person back. */
  next?: string;
  /**
   * Which side the "or" rule sits on. The short sign-in form puts these
   * buttons first and the rule below them; the long sign-up form puts
   * them last, under the rule.
   */
  divider?: "before" | "after" | "none";
}) {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState("");

  async function go(provider: (typeof PROVIDERS)[number]) {
    setBusy(provider.id);
    setError("");

    const { error: err } = await browserClient().auth.signInWithOAuth({
      provider: provider.id,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        scopes: provider.scopes,
        queryParams: provider.queryParams,
      },
    });

    // On success the browser has already left for the provider, so there is
    // nothing to reset. Only a failure gets this far.
    if (err) {
      setBusy(null);
      setError(err.message);
    }
  }

  const rule = (
    <div className="my-6 flex items-center gap-4">
      <span className="h-px flex-1 bg-sand-deep" />
      <span className="text-xs tracking-widest text-stone uppercase">or</span>
      <span className="h-px flex-1 bg-sand-deep" />
    </div>
  );

  return (
    <div>
      {divider === "before" && rule}

      <div className="space-y-3">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => go(p)}
            disabled={busy !== null}
            className="btn-lift flex w-full items-center justify-center gap-3 rounded-lg border border-sand-deep bg-paper py-3.5 font-medium text-ink transition-colors hover:border-forest disabled:opacity-60"
          >
            {/*
              A background image rather than an <img>. A missing file
              leaves an empty square and the button still reads correctly;
              an <img> would paint the browser's broken-image icon before
              any onError handler could hide it.
            */}
            <span
              aria-hidden="true"
              className="h-5 w-5 shrink-0 bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${p.logo})` }}
            />
            {busy === p.id ? "Taking you there" : p.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-lg border-l-2 border-gold bg-sand px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}

      {divider === "after" && rule}
    </div>
  );
}
