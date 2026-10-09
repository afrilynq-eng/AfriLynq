"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";

/**
 * The right hand end of the header: Sign In and Sign Up, or your name.
 *
 * This is a client component on purpose. Reading the session on the server
 * would mean touching cookies in the site layout, and that opts every page
 * under it out of static rendering, including the marketing pages that have
 * no business being rendered per request.
 *
 * The usual cost of doing it in the browser is a flash of "Sign In" before
 * the session resolves. That is avoided by checking for the Supabase auth
 * cookie synchronously on first render, which is enough to pick the right
 * shape immediately, and then confirming with getUser so a stale cookie
 * cannot leave a signed out person looking signed in.
 */

function projectRef() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname.split(".")[0];
  } catch {
    return "";
  }
}

/** A guess, good enough to choose the layout before the network answers. */
function cookieSuggestsSignedIn() {
  if (typeof document === "undefined") return false;
  const ref = projectRef();
  if (!ref) return false;
  // @supabase/ssr splits a long token across .0, .1 and so on, so match the
  // prefix rather than an exact name.
  return document.cookie
    .split("; ")
    .some((c) => c.startsWith(`sb-${ref}-auth-token`));
}

export default function AccountNav() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(cookieSuggestsSignedIn);
  const [name, setName] = useState("");

  useEffect(() => {
    const supabase = browserClient();
    let live = true;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!live) return;
        setSignedIn(Boolean(data.user));
        const meta = data.user?.user_metadata as
          | { first_name?: string; full_name?: string }
          | undefined;
        setName(
          meta?.first_name?.trim() ||
            meta?.full_name?.trim().split(/\s+/)[0] ||
            data.user?.email?.split("@")[0] ||
            ""
        );
      })
      .catch(() => {
        if (live) setSignedIn(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (live) setSignedIn(Boolean(session));
    });

    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    try {
      await browserClient().auth.signOut();
    } catch {
      // Leaving is what matters. An expired session fails here and is
      // already gone anyway.
    }
    setSignedIn(false);
    router.push("/");
    router.refresh();
  }

  if (!signedIn) {
    return (
      <>
        <Link
          href="/sign-in"
          className="btn-lift hidden rounded border border-forest px-3.5 py-1.5 text-[0.9rem] font-medium text-forest transition-colors hover:bg-forest hover:text-paper sm:inline-block"
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          className="btn-lift rounded bg-forest px-4 py-1.5 text-[0.9rem] font-medium text-paper transition-colors hover:bg-gold hover:text-forest-deep"
        >
          Sign Up
        </Link>
      </>
    );
  }

  return (
    <details className="relative">
      <summary className="btn-lift flex cursor-pointer list-none items-center gap-1.5 rounded bg-forest px-3.5 py-1.5 text-[0.9rem] font-medium text-paper transition-colors hover:bg-gold hover:text-forest-deep">
        <span className="max-w-[7rem] truncate">{name || "My account"}</span>
        <svg viewBox="0 0 10 6" className="h-2 w-2.5" aria-hidden="true">
          <path
            d="M1 1l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>

      <div className="absolute right-0 z-50 mt-2 w-52 rounded-lg border border-sand-deep bg-paper p-1.5 shadow-lg">
        <Link
          href="/account"
          className="block rounded px-3 py-2 text-sm text-ink-soft hover:bg-sand hover:text-forest"
        >
          Your account
        </Link>
        <Link
          href="/account/company"
          className="block rounded px-3 py-2 text-sm text-ink-soft hover:bg-sand hover:text-forest"
        >
          Company profile
        </Link>
        <Link
          href="/account/documents"
          className="block rounded px-3 py-2 text-sm text-ink-soft hover:bg-sand hover:text-forest"
        >
          Documents and verification
        </Link>
        <Link
          href="/account/settings"
          className="block rounded px-3 py-2 text-sm text-ink-soft hover:bg-sand hover:text-forest"
        >
          Settings
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="mt-1 block w-full border-t border-sand px-3 py-2 pt-2.5 text-left text-sm text-ink-soft hover:text-forest"
        >
          Sign out
        </button>
      </div>
    </details>
  );
}
