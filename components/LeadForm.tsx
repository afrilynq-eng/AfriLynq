"use client";

import { useState } from "react";
import { CATEGORIES, ORIGINS } from "@/lib/content";

type Kind = "buyer" | "supplier";

const COPY: Record<Kind, { heading: string; blurb: string; action: string; done: string }> = {
  buyer: {
    heading: "Tell us what you need to source",
    blurb:
      "Describe the product, the volume and roughly when you need it. We will come back with the suppliers we can put in front of you and what they can commit to.",
    action: "Send sourcing request",
    done: "Request received. We will review it and come back to you by email.",
  },
  supplier: {
    heading: "List your produce",
    blurb:
      "Tell us what you grow or process and where you export from. We will explain what verification involves and what we need from you before your listing goes live.",
    action: "Register interest",
    done: "Thank you. We will be in touch by email about verification.",
  },
};

export default function LeadForm({
  kind,
  defaultCategory,
}: {
  kind: Kind;
  defaultCategory?: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    setState("sending");
    setError("");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, leadType: kind }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Something went wrong on our side.");
      }

      setState("done");
      form.reset();
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong on our side.");
    }
  }

  const copy = COPY[kind];

  if (state === "done") {
    return (
      <div className="border-l-2 border-gold bg-sand px-6 py-8">
        <h3 className="text-lg">{copy.done}</h3>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="link-quiet mt-3 text-sm text-ink-soft"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-xl">
      <h3 className="text-2xl">{copy.heading}</h3>
      <p className="mt-3 text-ink-soft">{copy.blurb}</p>

      <div className="mt-8 space-y-5">
        <Field label="Your name" name="fullName" required autoComplete="name" />
        <Field label="Work email" name="email" type="email" required autoComplete="email" />
        <Field label="Company" name="companyName" autoComplete="organization" />
        <Field label="Phone, including country code" name="phone" autoComplete="tel" />

        <label className="block">
          <span className="text-sm font-medium text-ink">
            {kind === "buyer" ? "Where you are buying for" : "Where you export from"}
          </span>
          <select
            name="countryCode"
            defaultValue=""
            className="mt-2 w-full border border-sand-deep bg-paper px-3 py-2.5 text-ink"
          >
            <option value="">Select a country</option>
            {kind === "buyer" ? (
              <>
                <option value="GB">United Kingdom</option>
                <option value="IE">Ireland</option>
                <option value="NL">Netherlands</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="US">United States</option>
                <option value="AE">United Arab Emirates</option>
              </>
            ) : (
              ORIGINS.map((o) => (
                <option key={o.country} value={o.country}>
                  {o.country}
                </option>
              ))
            )}
          </select>
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-ink">
            {kind === "buyer" ? "What you are looking for" : "What you supply"}
          </legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CATEGORIES.map((c) => (
              <label key={c.slug} className="flex items-start gap-2.5 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  name="categories"
                  value={c.slug}
                  defaultChecked={c.slug === defaultCategory}
                  className="mt-1 accent-[var(--color-gold)]"
                />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-sm font-medium text-ink">
            {kind === "buyer"
              ? "Volume, specification and timing"
              : "Volumes, certifications and export experience"}
          </span>
          <textarea
            name="message"
            rows={5}
            className="mt-2 w-full border border-sand-deep bg-paper px-3 py-2.5 text-ink"
            placeholder={
              kind === "buyer"
                ? "For example: two containers of white sesame, 99 percent purity, delivered Felixstowe in March."
                : "For example: 40 tonnes of dried split ginger per month from Kaduna, GLOBALG.A.P. certified, exporting since 2019."
            }
          />
        </label>

        {/* Simple honeypot. Real rate limiting lives in the route handler. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
      </div>

      {state === "error" && (
        <p className="mt-5 border-l-2 border-gold bg-sand px-4 py-3 text-sm text-ink">
          {error} Please try again, or email info@afrilynq.co.uk directly.
        </p>
      )}

      <button
        type="submit"
        disabled={state === "sending"}
        className="btn-primary mt-8 disabled:opacity-60"
      >
        {state === "sending" ? "Sending" : copy.action}
      </button>

      <p className="mt-4 max-w-md text-xs leading-relaxed text-stone">
        We use these details only to respond to your enquiry and to contact you about
        AfriLynq. See our privacy notice for how long we keep them and how to ask us to
        delete them.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">
        {label}
        {required && <span className="text-gold"> *</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        autoComplete={autoComplete}
        className="mt-2 w-full border border-sand-deep bg-paper px-3 py-2.5 text-ink"
      />
    </label>
  );
}
