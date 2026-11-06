"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LANGUAGES,
  SOURCE_LANGUAGE,
  RTL,
  currentLanguage,
  setLanguageCookie,
} from "@/lib/languages";
import { readConsent, type Consent } from "@/lib/consent";

/**
 * Machine translation of the public site.
 *
 * This loads Google's page translator, which rewrites the text in the
 * browser after the page has rendered. Three deliberate limits, each
 * there for a reason rather than for neatness.
 *
 *
 * 1. Public pages only
 * --------------------
 * The translator is a third party script with read access to whatever
 * is on screen, and it sends that text to Google to be translated. On
 * the home page that is marketing copy. Inside /account it would be
 * enquiry details, company records and buyers' contact details, which
 * is somebody else's personal data going to a third party, and would
 * have to be disclosed as such.
 *
 * So it does not load there. The switcher is not rendered either, and
 * someone who picked French on the home page sees /account in English.
 * That is the intended behaviour, not an oversight.
 *
 *
 * 2. Only after cookie consent
 * ----------------------------
 * It sets cookies and calls a third party, so it waits for consent like
 * everything else here. Before consent the switcher shows English and
 * does nothing; the moment consent is granted it becomes live, without
 * a reload, because this listens for the consent event.
 *
 *
 * 3. Why the cookie rather than the widget's own dropdown
 * -------------------------------------------------------
 * Google's element renders a hidden <select> that most guides drive
 * with synthetic events. It is rebuilt at unpredictable moments and the
 * trick breaks silently. Setting the googtrans cookie and reloading is
 * what the widget itself does, and it survives navigation.
 *
 *
 * A known limitation, stated plainly
 * ----------------------------------
 * Rewriting text underneath React is not something React expects, and
 * on pages that update after load it can throw. Keeping this off the
 * portal and the forms, which are the pages that update most, is most
 * of the mitigation. The quality is machine quality, which is why the
 * menu says so.
 */

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement?: new (
          opts: Record<string, unknown>,
          el: string
        ) => unknown;
      };
    };
  }
}

const SCRIPT_ID = "afrilynq-gtranslate";
const WIDGET_ID = "afrilynq-gtranslate-host";

/** Pages where the translator must not run. */
function isPrivate(path: string) {
  return path.startsWith("/account") || path.startsWith("/admin");
}

export default function LanguageSwitcher() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState<Consent>(null);
  const [active, setActive] = useState(SOURCE_LANGUAGE);
  const wrap = useRef<HTMLDivElement>(null);

  const allowed = !isPrivate(path);

  useEffect(() => {
    setConsent(readConsent());
    setActive(currentLanguage());
    const onConsent = () => setConsent(readConsent());
    window.addEventListener("afrilynq:consent", onConsent);
    return () => window.removeEventListener("afrilynq:consent", onConsent);
  }, []);

  // Load Google's script, once, and only when we are allowed to.
  useEffect(() => {
    if (!allowed || consent !== "granted") return;
    if (document.getElementById(SCRIPT_ID)) return;

    window.googleTranslateElementInit = () => {
      const Ctor = window.google?.translate?.TranslateElement;
      if (!Ctor) return;
      try {
        new Ctor(
          { pageLanguage: SOURCE_LANGUAGE, autoDisplay: false },
          WIDGET_ID
        );
      } catch {
        // If Google changes the constructor shape, the page carries on
        // in English rather than breaking.
      }
    };

    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.body.appendChild(s);
  }, [allowed, consent]);

  // Arabic reads right to left, and the whole page has to turn round.
  useEffect(() => {
    const el = document.documentElement;
    el.lang = active;
    el.dir = RTL.has(active) ? "rtl" : "ltr";
  }, [active]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!allowed) return null;

  const current = LANGUAGES.find((l) => l.code === active) ?? LANGUAGES[0];

  function choose(code: string) {
    if (code === active) return setOpen(false);
    setLanguageCookie(code);
    // A reload is how the widget picks the cookie up, and it also
    // discards any half-rewritten DOM rather than leaving React to
    // reconcile against text it did not render.
    window.location.reload();
  }

  return (
    <>
      {/* Google insists on a host element. It is never visible; the
          switcher below is the real control. */}
      <div id={WIDGET_ID} className="hidden" aria-hidden="true" />

      <div ref={wrap} className="relative hidden sm:block">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="true"
          aria-label={`Language: ${current.english}. Change language`}
          className="notranslate flex cursor-pointer items-center gap-1 rounded px-2 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-sand"
          translate="no"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
            <ellipse cx="10" cy="10" rx="3.4" ry="8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2.4 10h15.2" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          {current.code === "zh-CN" ? "ZH" : current.code.toUpperCase()}
          <svg
            viewBox="0 0 20 20"
            className={"h-3 w-3 transition-transform " + (open ? "rotate-180" : "")}
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5.5 8l4.5 4.5L14.5 8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {open && (
          <div
            className="notranslate absolute right-0 z-50 mt-2 w-64 rounded-lg border border-sand-deep bg-paper p-1.5 shadow-lg"
            translate="no"
          >
            <ul className="max-h-[22rem] overflow-y-auto">
              {LANGUAGES.map((lang) => (
                <li key={lang.code}>
                  <button
                    type="button"
                    onClick={() => choose(lang.code)}
                    className={
                      "flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition-colors " +
                      (lang.code === active
                        ? "bg-sand font-medium text-forest"
                        : "text-ink hover:bg-sand")
                    }
                  >
                    <span>{lang.label}</span>
                    {lang.code === active && (
                      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                        <path
                          d="M5 10.5l3 3 7-7.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            <p className="border-t border-sand px-3 pt-2.5 pb-1.5 text-xs leading-relaxed text-stone">
              {consent === "granted"
                ? "Translated automatically. Wording may not be exact, and your account pages stay in English."
                : "Accept cookies to use translation. It is provided by Google."}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
