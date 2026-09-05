"use client";

import { useEffect, useState } from "react";
import { readConsent, writeConsent, clearConsent, type Consent } from "@/lib/consent";

/** Lets someone see and change their choice from the cookie notice page. */
export default function CookieSettingsButton() {
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
    setReady(true);
    const onChange = (e: Event) => setConsent((e as CustomEvent).detail);
    window.addEventListener("afrilynq:consent", onChange);
    return () => window.removeEventListener("afrilynq:consent", onChange);
  }, []);

  if (!ready) return null;

  const label =
    consent === "granted"
      ? "You have accepted analytics cookies."
      : consent === "denied"
        ? "You have declined analytics cookies."
        : "You have not made a choice yet.";

  return (
    <div className="rounded border border-sand-deep bg-sand px-5 py-4">
      <p className="text-sm text-ink">{label}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        {consent !== "granted" && (
          <button type="button" onClick={() => writeConsent("granted")} className="btn-primary !py-2 !px-4 text-sm">
            Accept analytics
          </button>
        )}
        {consent !== "denied" && (
          <button type="button" onClick={() => writeConsent("denied")} className="btn-ghost !py-2 !px-4 text-sm">
            Decline analytics
          </button>
        )}
        {consent !== null && (
          <button type="button" onClick={clearConsent} className="link-quiet py-2 text-sm text-ink-soft">
            Reset and ask me again
          </button>
        )}
      </div>
    </div>
  );
}
