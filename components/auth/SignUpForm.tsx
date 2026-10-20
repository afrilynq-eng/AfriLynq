"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";
import { COUNTRIES } from "@/lib/countries";
import SocialButtons from "./SocialButtons";
import PasswordField, { passwordProblems } from "./PasswordField";

/**
 * Creating an account.
 *
 * Longer than a sign-up form usually wants to be, and deliberately so:
 * this is a trade marketplace, not a newsletter. The role decides which
 * half of the product they land in, and the company details asked for
 * here are the ones verification needs anyway, so collecting them once at
 * the start saves a second pass later.
 *
 * Nothing here creates a company. The name and registration number travel
 * in the signup metadata and pre-fill the company form after the email is
 * verified, which is step three. Creating a company for somebody who then
 * never confirms their address would leave orphan records in the
 * directory queue.
 */

type Role = "supplier" | "buyer" | "shopper" | "both";

const ROLES: { id: Role; title: string; body: string; icon: string }[] = [
  {
    id: "supplier",
    title: "Farmer or supplier",
    body: "Sell produce or products to buyers in the UK and worldwide.",
    icon: "leaf",
  },
  {
    id: "buyer",
    title: "Retailer",
    body: "Source in volume from verified African suppliers.",
    icon: "shop",
  },
  {
    id: "shopper",
    title: "Shopper",
    body: "Buy for yourself and your household.",
    icon: "basket",
  },
  {
    id: "both",
    title: "Supplier and retailer",
    body: "Sell your own produce and source from others.",
    icon: "swap",
  },
];

function Icon({ name }: { name: string }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.6 };
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      {name === "leaf" && (
        <>
          <path d="M20 4c0 8.5-5.3 12.6-11.3 12.6-2.4 0-4.4-.7-4.4-.7S3.6 8.4 11.6 6.2C15.2 5.2 20 4 20 4Z" {...s} strokeLinejoin="round" />
          <path d="M17 7.4C11.9 9.6 8.5 13.7 6.6 20" {...s} strokeLinecap="round" />
        </>
      )}
      {name === "shop" && (
        <>
          <path d="M3.5 9.5h17V19a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V9.5Z" {...s} strokeLinejoin="round" />
          <path d="M3 9.5 5 4h14l2 5.5" {...s} strokeLinejoin="round" />
          <path d="M9.5 20v-5h5v5" {...s} strokeLinejoin="round" />
        </>
      )}
      {name === "basket" && (
        <>
          <path d="M3 9h18l-1.7 9.8a1.8 1.8 0 0 1-1.8 1.5H6.5a1.8 1.8 0 0 1-1.8-1.5z" {...s} strokeLinejoin="round" />
          <path d="M8 9l2.6-5.4M16 9l-2.6-5.4" {...s} strokeLinecap="round" />
        </>
      )}
      {name === "swap" && (
        <>
          <path d="M4 8.5h13l-3-3M20 15.5H7l3 3" {...s} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

const label =
  "block text-[0.7rem] font-semibold tracking-widest text-forest uppercase";
const field =
  "mt-2 w-full rounded-lg border border-sand-deep bg-paper px-4 py-3 text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30";
const hint = "mt-1.5 block text-xs text-stone";

export default function SignUpForm({ initialError = "" }: { initialError?: string }) {
  const router = useRouter();

  const [role, setRole] = useState<Role>("supplier");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);

  const problems = passwordProblems(password);
  const matches = confirm.length > 0 && confirm === password;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = (n: string) => String(data.get(n) ?? "").trim();

    setError("");

    if (problems.length > 0) {
      setError(`Your password still needs: ${problems.join(", ").toLowerCase()}.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    if (!terms) {
      setError("Please agree to the terms of use before creating your account.");
      return;
    }

    const email = text("email");
    setBusy(true);

    const { error: err } = await browserClient().auth.signUp({
      email,
      password,
      options: {
        /**
         * Read by the on_auth_user_created trigger. company_name and
         * registration_number are not profile fields: they stay here and
         * are read back by the company form after verification.
         */
        data: {
          first_name: text("firstName"),
          last_name: text("lastName"),
          phone: text("phone"),
          country_code: text("countryCode"),
          city: text("city"),
          account_type: role,
          marketing_opt_in: data.get("marketing") === "on",
          company_name: text("companyName"),
          registration_number: text("registrationNumber"),
        },
        // The code in the email is the main route. This keeps the link in
        // the same message working for anyone who presses it instead.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }

    router.push(`/verify?email=${encodeURIComponent(email)}`);
  }

  return (
    <form onSubmit={submit} className="overflow-hidden rounded-xl bg-paper p-7 shadow-lg ring-1 ring-sand-deep sm:p-9">
      {/* ---------- 1. Role ---------- */}
      <fieldset>
        <legend className="text-xl font-semibold text-forest">
          1. How will you use AfriLynq?
        </legend>
        <p className="mt-1 text-sm text-ink-soft">
          Choose one. You can add a second role later from your account.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {ROLES.map((r) => {
            const on = role === r.id;
            return (
              <label
                key={r.id}
                className={
                  "flex cursor-pointer gap-3 rounded-lg border-2 px-4 py-4 transition-colors " +
                  (on
                    ? "border-forest bg-forest/5"
                    : "border-sand-deep hover:border-gold/60")
                }
              >
                <input
                  type="radio"
                  name="role"
                  value={r.id}
                  checked={on}
                  onChange={() => setRole(r.id)}
                  className="mt-1 accent-[var(--color-forest)]"
                />
                <span
                  className={
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " +
                    (on ? "bg-forest text-paper" : "bg-forest/90 text-paper")
                  }
                >
                  <Icon name={r.icon} />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">{r.title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-ink-soft">
                    {r.body}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        {role === "both" && (
          <p className="mt-4 rounded-lg border border-gold/40 bg-gold/8 px-4 py-3 text-sm leading-relaxed text-ink">
            <span className="font-semibold text-forest">Supply and buy:</span> you
            get one login with a switcher to move between your supplier and
            retailer dashboards.
          </p>
        )}
      </fieldset>

      {/* ---------- 2. Person ---------- */}
      <fieldset className="mt-9">
        <legend className="text-xl font-semibold text-forest">2. Your details</legend>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label>
            <span className={label}>
              First name <span className="text-gold">*</span>
            </span>
            <input type="text" name="firstName" required autoComplete="given-name" className={field} />
          </label>
          <label>
            <span className={label}>
              Last name <span className="text-gold">*</span>
            </span>
            <input type="text" name="lastName" required autoComplete="family-name" className={field} />
          </label>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label>
            <span className={label}>
              Email address <span className="text-gold">*</span>
            </span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className={field}
            />
            <span className={hint}>This is the address you sign in with</span>
          </label>
          <label>
            <span className={label}>Phone</span>
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              placeholder="+234 or +44"
              className={field}
            />
          </label>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label>
            <span className={label}>
              Country <span className="text-gold">*</span>
            </span>
            <select name="countryCode" required defaultValue="" className={field}>
              <option value="">Select a country</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>City or town</span>
            <input type="text" name="city" autoComplete="address-level2" className={field} />
          </label>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <PasswordField
            name="password"
            label="Password"
            value={password}
            onChange={setPassword}
            showRules
          />
          <PasswordField
            name="confirmPassword"
            label="Confirm password"
            value={confirm}
            onChange={setConfirm}
            note={
              confirm.length === 0
                ? undefined
                : matches
                  ? "Passwords match"
                  : "Passwords do not match yet"
            }
            noteTone={matches ? "good" : "bad"}
          />
        </div>
      </fieldset>

      {/* ---------- 3. Business ---------- */}
      {role !== "shopper" && (
        <fieldset className="mt-9">
          <legend className="text-xl font-semibold text-forest">3. Your business</legend>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label>
              <span className={label}>Registered company name</span>
              <input
                type="text"
                name="companyName"
                autoComplete="organization"
                placeholder="As on your registration"
                className={field}
              />
              <span className={hint}>You can add this later</span>
            </label>
            <label>
              <span className={label}>Registration number</span>
              <input
                type="text"
                name="registrationNumber"
                placeholder="CAC or Companies House"
                className={field}
              />
              <span className={hint}>Needed before verification</span>
            </label>
          </div>
        </fieldset>
      )}

      {/* ---------- Consent ---------- */}
      <div className="mt-8 space-y-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-1 accent-[var(--color-forest)]"
          />
          <span className="text-sm leading-relaxed text-ink">
            I agree to the{" "}
            <Link href="/terms" className="underline">
              terms of use
            </Link>{" "}
            and have read the{" "}
            <Link href="/privacy" className="underline">
              privacy notice
            </Link>
            . AfriLynq introduces buyers and suppliers and is not a party to any
            sale.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="marketing" className="mt-1 accent-[var(--color-forest)]" />
          <span className="text-sm leading-relaxed text-ink-soft">
            Send me market insight and new opportunities. Optional, and you can
            stop at any time.
          </span>
        </label>
      </div>

      {error && (
        <p className="mt-6 rounded-lg border-l-2 border-gold bg-sand px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="btn-lift mt-7 w-full rounded-lg bg-forest py-4 font-medium text-paper transition-colors hover:bg-gold hover:text-forest-deep disabled:opacity-60"
      >
        {busy ? "Creating your account" : "Create my account"}
      </button>

      <SocialButtons divider="before" />

      <p className="mt-7 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/sign-in" className="link-quiet font-medium text-forest">
          Sign in
        </Link>
      </p>
    </form>
  );
}
