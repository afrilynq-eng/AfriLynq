"use client";

import { useState } from "react";
import PhoneField from "@/components/PhoneField";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";
import { COUNTRIES } from "@/lib/countries";
import SocialButtons from "./SocialButtons";
import PasswordField, { passwordProblems } from "./PasswordField";

/**
 * Registration built for one audience at a time.
 *
 * The general form at /sign-up opens by asking which of four things you
 * are. Somebody who arrived by pressing "Join as a farmer" has already
 * answered that, and asking again is both a wasted step and a small
 * insult. These three forms skip it and ask what actually differs.
 *
 * What differs is real, not cosmetic. A shopper has no company, no
 * registration number and no volume, so a third of the general form is
 * simply absent. A farmer is asked what they supply; a retailer is asked
 * what they source and how much. Those answers are kept, because they are
 * the first questions the other side of a trade asks anyway.
 */

export type Kind = "farmer" | "retailer" | "shopper";

interface Shape {
  accountType: "supplier" | "buyer" | "shopper";
  /** Default country, since almost everyone on each route is in one place. */
  country: string;
  /** Null for a shopper, who has no business. */
  business: null | { heading: string; nameLabel: string; numberLabel: string; numberHint: string };
  categories: { heading: string; hint: string; required: boolean };
  kinds: null | { heading: string; options: { value: string; label: string }[] };
  volume: boolean;
}

export const SHAPES: Record<Kind, Shape> = {
  farmer: {
    accountType: "supplier",
    country: "NG",
    business: {
      heading: "Your farm or business",
      nameLabel: "Registered name",
      // This asked for a CAC number, which only exists in Nigeria, on a
      // platform that sources from across the continent. A Ghanaian
      // cooperative, a Kenyan exporter and an Ethiopian processor all
      // have a registration number and none of them have that one.
      //
      // The label names no authority and the hint gives examples rather
      // than requirements, because the document that proves a farm is
      // real differs by country and sometimes by crop: a company
      // registration, a cooperative certificate, an export licence, a
      // produce board or marketing board registration.
      numberLabel: "Business registration number",
      numberHint:
        "Your company, cooperative or export registration, whichever applies where you are. Needed before you can be verified.",
    },
    categories: {
      heading: "What do you supply?",
      hint: "Pick everything you can supply now or in season. Buyers search on these.",
      required: true,
    },
    kinds: {
      heading: "What best describes you?",
      options: [
        { value: "farmer", label: "I farm it myself" },
        { value: "cooperative", label: "A cooperative or farmer group" },
        { value: "processor", label: "I process or pack it" },
        { value: "exporter", label: "I buy from farms and export" },
      ],
    },
    volume: false,
  },
  retailer: {
    accountType: "buyer",
    country: "GB",
    business: {
      heading: "Your business",
      nameLabel: "Registered company name",
      // Same reasoning as the farmer route above. Most retailers here are
      // in the UK, so Companies House is the example rather than the
      // label.
      numberLabel: "Company registration number",
      numberHint: "Companies House in the UK, or your national equivalent",
    },
    categories: {
      heading: "What do you want to source?",
      hint: "We show you verified suppliers in these, and tell them you are looking.",
      required: true,
    },
    kinds: {
      heading: "What kind of buyer are you?",
      options: [
        { value: "wholesaler", label: "Wholesaler" },
        { value: "independent", label: "Independent shop or chain" },
        { value: "restaurant", label: "Restaurant or caterer" },
        { value: "distributor", label: "Distributor or importer" },
      ],
    },
    volume: true,
  },
  shopper: {
    accountType: "shopper",
    country: "GB",
    business: null,
    categories: {
      heading: "What are you looking for?",
      hint: "Optional. It helps us show you the right things first.",
      required: false,
    },
    kinds: null,
    volume: false,
  },
};

const VOLUMES = [
  { value: "under-1t", label: "Under 1 tonne a month" },
  { value: "1-10t", label: "1 to 10 tonnes a month" },
  { value: "10-50t", label: "10 to 50 tonnes a month" },
  { value: "over-50t", label: "More than 50 tonnes a month" },
];

const label = "block text-[0.7rem] font-semibold tracking-widest text-forest uppercase";
const field =
  "mt-2 w-full rounded-lg border border-sand-deep bg-paper px-4 py-3 text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30";
const hint = "mt-1.5 block text-xs text-stone";

export default function RoleSignUpForm({
  kind,
  categories,
  initialError = "",
}: {
  kind: Kind;
  categories: { id: string; name: string; slug: string }[];
  initialError?: string;
}) {
  const router = useRouter();
  const shape = SHAPES[kind];

  const [picked, setPicked] = useState<string[]>([]);
  const [businessKind, setBusinessKind] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);

  const problems = passwordProblems(password);
  const matches = confirm.length > 0 && confirm === password;

  function toggle(slug: string) {
    setPicked((list) =>
      list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]
    );
  }

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
    if (shape.categories.required && categories.length > 0 && picked.length === 0) {
      setError(`Please pick at least one. ${shape.categories.heading}`);
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
        data: {
          first_name: text("firstName"),
          last_name: text("lastName"),
          phone: text("phone"),
          country_code: text("countryCode"),
          city: text("city"),
          account_type: shape.accountType,
          interest_slugs: picked,
          business_kind: businessKind || null,
          volume_band: shape.volume ? text("volumeBand") || null : null,
          marketing_opt_in: data.get("marketing") === "on",
          // Not profile fields. They ride along and pre-fill the company
          // form once the email is confirmed.
          company_name: shape.business ? text("companyName") : "",
          registration_number: shape.business ? text("registrationNumber") : "",
        },
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

  let step = 1;
  const n = () => step++;

  return (
    <form
      onSubmit={submit}
      className="overflow-hidden rounded-xl bg-paper p-7 shadow-lg ring-1 ring-sand-deep sm:p-9"
    >
      {/* ---------- Person ---------- */}
      <fieldset>
        <legend className="text-xl font-semibold text-forest">
          {n()}. Your details
        </legend>

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
          <PhoneField
            name="phone"
            label="Phone"
            id="signup-phone"
            defaultCountry={shape.country}
            labelClass={label}
            fieldClass={field}
            hintClass={hint}
          />
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label>
            <span className={label}>
              Country <span className="text-gold">*</span>
            </span>
            <select name="countryCode" required defaultValue={shape.country} className={field}>
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

      {/* ---------- Categories ---------- */}
      {categories.length > 0 && (
      <fieldset className="mt-9">
        <legend className="text-xl font-semibold text-forest">
          {n()}. {shape.categories.heading}
          {shape.categories.required && <span className="text-gold"> *</span>}
        </legend>
        <p className="mt-1 text-sm text-ink-soft">{shape.categories.hint}</p>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {categories.map((c) => {
            const on = picked.includes(c.slug);
            return (
              <label
                key={c.id}
                className={
                  "flex cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 text-sm transition-colors " +
                  (on ? "border-forest bg-forest/5" : "border-sand-deep hover:border-gold/60")
                }
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(c.slug)}
                  className="accent-[var(--color-forest)]"
                />
                <span className="text-ink">{c.name}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      )}

      {/* ---------- Who they are in the trade ---------- */}
      {shape.kinds && (
        <fieldset className="mt-9">
          <legend className="text-xl font-semibold text-forest">
            {n()}. {shape.kinds.heading}
          </legend>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {shape.kinds.options.map((o) => (
              <label
                key={o.value}
                className={
                  "flex cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 text-sm transition-colors " +
                  (businessKind === o.value
                    ? "border-forest bg-forest/5"
                    : "border-sand-deep hover:border-gold/60")
                }
              >
                <input
                  type="radio"
                  name="businessKind"
                  value={o.value}
                  checked={businessKind === o.value}
                  onChange={() => setBusinessKind(o.value)}
                  className="accent-[var(--color-forest)]"
                />
                <span className="text-ink">{o.label}</span>
              </label>
            ))}
          </div>

          {shape.volume && (
            <label className="mt-5 block">
              <span className={label}>Roughly how much do you buy?</span>
              <select name="volumeBand" defaultValue="" className={field}>
                <option value="">Prefer not to say</option>
                {VOLUMES.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
              <span className={hint}>
                Suppliers ask this first. Answering it gets you better quotes.
              </span>
            </label>
          )}
        </fieldset>
      )}

      {/* ---------- Business ---------- */}
      {shape.business && (
        <fieldset className="mt-9">
          <legend className="text-xl font-semibold text-forest">
            {n()}. {shape.business.heading}
          </legend>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label>
              <span className={label}>{shape.business.nameLabel}</span>
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
              <span className={label}>{shape.business.numberLabel}</span>
              <input type="text" name="registrationNumber" className={field} />
              <span className={hint}>{shape.business.numberHint}</span>
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
