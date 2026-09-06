"use client";

import { useState } from "react";

/**
 * Subscription band. Writes to the same leads table as the contact forms,
 * with lead_type "other", so everything arrives in one place and shows up in
 * the administration screen without a second system to maintain.
 */
export default function Newsletter() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();

    setState("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadType: "other",
          fullName: email.split("@")[0] || "Subscriber",
          email,
          source: "newsletter",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "That did not go through.");
      }
      setState("done");
      form.reset();
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "That did not go through.");
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="rounded-lg bg-forest px-6 py-8 sm:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="mt-0.5 hidden rounded bg-forest-soft p-2.5 sm:block" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                <rect x="2.5" y="5" width="19" height="14" rx="2" stroke="var(--color-gold)" strokeWidth="1.6" />
                <path d="M3 6.5l9 6 9-6" stroke="var(--color-gold)" strokeWidth="1.6" />
              </svg>
            </span>
            <div>
              <h2 className="text-xl !text-paper sm:text-2xl">
                Stay updated with the latest opportunities
              </h2>
              <p className="mt-1.5 text-[0.95rem] text-sand-deep">
                Market insight, new listings and trade opportunities, sent when there
                is something worth sending.
              </p>
            </div>
          </div>

          {state === "done" ? (
            <p className="shrink-0 rounded bg-forest-soft px-5 py-3 text-paper">
              Thank you. You are on the list.
            </p>
          ) : (
            <form onSubmit={submit} className="flex w-full shrink-0 gap-0 lg:w-auto">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                name="email"
                required
                placeholder="Enter your email address"
                className="w-full rounded-l bg-paper px-4 py-3 text-ink lg:w-80"
              />
              <button
                type="submit"
                disabled={state === "sending"}
                className="shrink-0 rounded-r bg-gold px-6 py-3 font-medium text-forest-deep transition-colors hover:bg-gold-deep hover:text-paper disabled:opacity-60"
              >
                {state === "sending" ? "Sending" : "Subscribe"}
              </button>
            </form>
          )}
        </div>

        {state === "error" && (
          <p className="mt-4 text-sm text-sand-deep">{message}</p>
        )}
      </div>
    </section>
  );
}
