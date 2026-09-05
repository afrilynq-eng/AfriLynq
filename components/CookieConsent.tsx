"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readConsent, writeConsent, type Consent } from "@/lib/consent";

/**
 * Cookie banner.
 *
 * Two rules drive the design. Accept and decline are the same size and the same
 * prominence, because a decline button that is harder to find than accept is
 * not a free choice. And nothing that needs consent loads until consent is
 * given, which is handled in Analytics rather than here.
 */
export default function CookieConsent() {
  const [consent, setConsent] = useState<Consent>("granted"); // assume decided until we know
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
    setReady(true);

    const onChange = (e: Event) => setConsent((e as CustomEvent).detail);
    window.addEventListener("afrilynq:consent", onChange);
    return () => window.removeEventListener("afrilynq:consent", onChange);
  }, []);

  useEffect(() => {
    // Reserve space so the banner never covers the footer or a form button.
    document.body.style.paddingBottom = ready && consent === null ? "9rem" : "";
    return () => {
      document.body.style.paddingBottom = "";
    };
  }, [ready, consent]);

  if (!ready || consent !== null) return null;

  function choose(value: "granted" | "denied") {
    writeConsent(value);
    setConsent(value);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie choices"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-forest bg-forest-deep px-6 py-5 text-paper"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-2xl text-sm leading-relaxed text-sand-deep">
          We use cookies that are necessary for the site to work. We would also
          like to set analytics cookies to understand which pages are useful.
          Declining changes nothing about how the site works for you. See our{" "}
          <Link href="/cookies" className="underline">
            cookie notice
          </Link>
          .
        </p>

        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => choose("denied")}
            className="rounded border border-sand-deep px-5 py-2.5 text-sm text-paper transition-colors hover:bg-paper hover:text-forest"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            className="rounded bg-gold px-5 py-2.5 text-sm font-medium text-forest-deep transition-colors hover:bg-paper"
          >
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  );
}
