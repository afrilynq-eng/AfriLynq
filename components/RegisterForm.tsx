"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORIES, ORIGINS } from "@/lib/content";
import { COUNTRIES } from "@/lib/countries";

type Kind = "buyer" | "supplier";

const COPY: Record<
  Kind,
  {
    band: string;
    bandSub: string;
    company: string;
    country: string;
    countryHelp: string;
    interest: string;
    detail: string;
    detailHelp: string;
    placeholder: string;
    action: string;
    note: string;
    done: string;
  }
> = {
  buyer: {
    band: "Join as a retailer",
    bandSub: "No account needed to get started",
    company: "Company name",
    country: "Where you are buying for",
    countryHelp: "The market the goods are landing in",
    interest: "What you are looking to source",
    detail: "Volume, specification and timing",
    detailHelp: "The more you put here, the faster a usable quotation comes back",
    placeholder:
      "For example: two containers of white sesame, 99 percent purity, delivered Felixstowe in March.",
    action: "Create my sourcing request",
    note: "Free to register. We come back to you with the suppliers we can reach for your product, and what they can commit to.",
    done: "Request received. We will review it and come back to you by email.",
  },
  supplier: {
    band: "Join as a farmer or exporter",
    bandSub: "Free to list, verification before you go live",
    company: "Business or co-operative name",
    country: "What is your country of origin",
    countryHelp: "Your home country",
    interest: "What you supply",
    detail: "Volumes, certifications and export experience",
    detailHelp: "Tell us what you can actually ship and how often",
    placeholder:
      "For example: 40 tonnes of dried split ginger per month from Kaduna, GLOBALG.A.P. certified, exporting since 2019.",
    action: "Register my business",
    note: "Free to register. We will explain what verification involves and what we need from you before your listing goes live.",
    done: "Thank you. We will be in touch by email about verification.",
  },
};

/**
 * Registration form.
 *
 * Laid out like the Ova-Sabi account creation card the client asked for, in
 * light colours to match the rest of the public site: a coloured header band,
 * small letterspaced field labels, a two column grid where fields pair
 * naturally, a highlighted note, and one full width action.
 *
 * Every field from the earlier enquiry form is kept. Nothing has been dropped
 * in the restyle.
 */
export default function RegisterForm({ kind }: { kind: Kind }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const copy = COPY[kind];

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const categories = new FormData(form).getAll("categories");

    setState("sending");
    setError("");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, categories, leadType: kind }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Something went wrong on our side.");
      }
      setState("done");
      form.reset();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong on our side.");
    }
  }

  const label =
    "block text-[0.7rem] font-semibold tracking-widest text-forest uppercase";
  const field =
    "mt-2 w-full rounded-lg border border-sand-deep bg-paper px-4 py-3 text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30";

  if (state === "done") {
    return (
      <div className="overflow-hidden rounded-xl bg-paper shadow-lg ring-1 ring-sand-deep">
        <div className="bg-forest px-7 py-6">
          <h2 className="text-xl !text-paper">Registration received</h2>
        </div>
        <div className="px-7 py-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/15">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" stroke="var(--color-gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <p className="mt-5 text-lg text-ink">{copy.done}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/categories" className="btn-primary">
              Browse what we source
            </Link>
            <button type="button" onClick={() => setState("idle")} className="btn-ghost">
              Register another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-paper shadow-lg ring-1 ring-sand-deep">
      <div className="bg-forest px-7 py-6">
        <h2 className="text-xl !text-paper">{copy.band}</h2>
        <p className="mt-1 text-sm text-sand-deep">{copy.bandSub}</p>
      </div>

      <form onSubmit={submit} className="px-7 py-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <label>
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

          <label>
            <span className={label}>Phone number</span>
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              placeholder="Including country code"
              className={field}
            />
          </label>
        </div>

        <label className="mt-5 block">
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

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label>
            <span className={label}>{copy.company}</span>
            <input
              type="text"
              name="companyName"
              autoComplete="organization"
              placeholder="Your business or company name"
              className={field}
            />
          </label>

          <label>
            <span className={label}>{copy.country}</span>
            <select name="countryCode" defaultValue="" className={field}>
              <option value="">Select a country</option>
                            {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="mt-1.5 block text-xs text-stone">{copy.countryHelp}</span>
          </label>
        </div>

        <fieldset className="mt-6">
          <legend className={label}>{copy.interest}</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CATEGORIES.map((c) => (
              <label
                key={c.slug}
                className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-sand-deep px-3.5 py-2.5 text-sm text-ink-soft transition-colors hover:border-gold hover:bg-sand"
              >
                <input
                  type="checkbox"
                  name="categories"
                  value={c.slug}
                  className="mt-0.5 accent-[var(--color-gold)]"
                />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mt-6 block">
          <span className={label}>{copy.detail}</span>
          <textarea
            name="message"
            rows={5}
            placeholder={copy.placeholder}
            className={field}
          />
          <span className="mt-1.5 block text-xs text-stone">{copy.detailHelp}</span>
        </label>

        {/* Honeypot. Rate limiting lives in the route handler. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />

        <div className="mt-6 rounded-lg border border-gold/40 bg-gold/8 px-4 py-3.5">
          <p className="text-sm leading-relaxed text-ink">
            <span className="font-semibold text-forest">Free to register.</span>{" "}
            {copy.note.replace("Free to register. ", "")}
          </p>
        </div>

        {state === "error" && (
          <p className="mt-5 rounded-lg border-l-2 border-gold bg-sand px-4 py-3 text-sm text-ink">
            {error} Please try again, or email info@afrilynq.co.uk directly.
          </p>
        )}

        <button
          type="submit"
          disabled={state === "sending"}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-forest py-4 font-medium text-paper transition-colors hover:bg-gold hover:text-forest-deep disabled:opacity-60"
        >
          {state === "sending" ? "Sending" : copy.action}
          {state !== "sending" && <span aria-hidden="true">&rarr;</span>}
        </button>

        <p className="mt-4 text-center text-xs leading-relaxed text-stone">
          We use these details only to respond to you and to contact you about AfriLynq.
          See our <Link href="/privacy" className="underline">privacy notice</Link>.
        </p>
      </form>
    </div>
  );
}
