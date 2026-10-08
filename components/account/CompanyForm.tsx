"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";
import { COUNTRIES } from "@/lib/countries";

const TYPES = [
  {
    value: "supplier",
    title: "I supply produce",
    body: "Farms, co-operatives, processors and exporters. You list what you can ship and answer enquiries from buyers.",
  },
  {
    value: "buyer",
    title: "I buy produce",
    body: "Retailers, importers, manufacturers and wholesalers. You send a specification and compare the quotations that come back.",
  },
  {
    value: "both",
    title: "I do both",
    body: "You supply and you source. One company, both sides of the trade.",
  },
] as const;

/**
 * Turn a company name into a URL safe slug.
 *
 * A short random suffix is appended because slug is unique across the table
 * and two companies with the same trading name is ordinary, not an error. The
 * alternative, a round trip to check and retry, costs more than four
 * characters of noise in a URL nobody types by hand.
 */
function toSlug(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "company"}-${suffix}`;
}

export default function CompanyForm({
  defaultEmail,
}: {
  defaultEmail: string | null;
}) {
  const router = useRouter();
  const [type, setType] = useState<string>("supplier");
  const [state, setState] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    const legalName = String(data.get("legalName") ?? "").trim();
    const tradingName = String(data.get("tradingName") ?? "").trim();

    setState("saving");
    setError("");

    const supabase = browserClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setState("idle");
      setError("Your session has expired. Please sign in again.");
      return;
    }

    const { data: created, error: err } = await supabase
      .from("companies")
      .insert({
        legal_name: legalName,
        trading_name: tradingName || null,
        slug: toSlug(tradingName || legalName),
        company_type: type,
        country_code: String(data.get("countryCode") ?? "") || null,
        city: String(data.get("city") ?? "").trim() || null,
        registration_number:
          String(data.get("registrationNumber") ?? "").trim() || null,
        contact_email: String(data.get("contactEmail") ?? "").trim() || null,
        contact_phone: String(data.get("contactPhone") ?? "").trim() || null,
        short_description:
          String(data.get("shortDescription") ?? "").trim() || null,
        // Required by the companies_insert policy, and read by the
        // companies_create_owner trigger to make you the owner.
        created_by: user.id,
      })
      .select("id")
      .single();

    if (err || !created) {
      setState("idle");
      setError(
        err?.message ??
          "We could not save that just now. Please try again, or email info@afrilynq.co.uk."
      );
      return;
    }

    router.push("/account");
    router.refresh();
  }

  const label =
    "block text-[0.7rem] font-semibold tracking-widest text-forest uppercase";
  const field =
    "mt-2 w-full rounded-lg border border-sand-deep bg-paper px-4 py-3 text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30";

  return (
    <div className="overflow-hidden rounded-xl bg-paper shadow-lg ring-1 ring-sand-deep">
      <div className="bg-forest px-7 py-6">
        <h1 className="text-xl !text-paper">Create your company</h1>
        <p className="mt-1 text-sm text-sand-deep">
          You can change any of this later
        </p>
      </div>

      <form onSubmit={submit} className="px-7 py-7">
        {/* What the company does. This decides which side of the trade it
            sits on, and it is the only field that is awkward to change later
            once listings exist, so it comes first. */}
        <fieldset>
          <legend className={label}>
            What does your company do <span className="text-gold">*</span>
          </legend>
          <div className="mt-3 space-y-2.5">
            {TYPES.map((t) => (
              <label
                key={t.value}
                className={
                  "flex cursor-pointer gap-3 rounded-lg border px-4 py-3.5 transition-colors " +
                  (type === t.value
                    ? "border-gold bg-gold/8"
                    : "border-sand-deep hover:border-gold/50 hover:bg-sand")
                }
              >
                <input
                  type="radio"
                  name="companyType"
                  value={t.value}
                  checked={type === t.value}
                  onChange={() => setType(t.value)}
                  className="mt-1 accent-[var(--color-gold)]"
                />
                <span>
                  <span className="block font-medium text-ink">{t.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
                    {t.body}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label>
            <span className={label}>
              Registered company name <span className="text-gold">*</span>
            </span>
            <input
              type="text"
              name="legalName"
              required
              autoComplete="organization"
              placeholder="As it appears on your registration"
              className={field}
            />
          </label>

          <label>
            <span className={label}>Trading name</span>
            <input
              type="text"
              name="tradingName"
              placeholder="If you trade under a different name"
              className={field}
            />
            <span className="mt-1.5 block text-xs text-stone">
              This is the name buyers see
            </span>
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
            <span className="mt-1.5 block text-xs text-stone">
              Where the business is registered
            </span>
          </label>

          <label>
            <span className={label}>City</span>
            <input type="text" name="city" placeholder="City or town" className={field} />
          </label>
        </div>

        <label className="mt-5 block">
          <span className={label}>Registration number</span>
          <input
            type="text"
            name="registrationNumber"
            placeholder="Your company registration or incorporation number"
            className={field}
          />
          <span className="mt-1.5 block text-xs text-stone">
            Needed before verification, but you can add it later
          </span>
        </label>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label>
            <span className={label}>Contact email</span>
            <input
              type="email"
              name="contactEmail"
              defaultValue={defaultEmail ?? ""}
              placeholder="Where enquiries should go"
              className={field}
            />
          </label>

          <label>
            <span className={label}>Contact phone</span>
            <input
              type="tel"
              name="contactPhone"
              placeholder="Including country code"
              className={field}
            />
          </label>
        </div>

        <label className="mt-5 block">
          <span className={label}>What your company does, in a line</span>
          <textarea
            name="shortDescription"
            rows={3}
            maxLength={280}
            placeholder="For example: a sesame and hibiscus exporter in Jigawa, shipping since 2019."
            className={field}
          />
          <span className="mt-1.5 block text-xs text-stone">
            Shown under your name in the directory
          </span>
        </label>

        <div className="mt-6 rounded-lg border border-gold/40 bg-gold/8 px-4 py-3.5">
          <p className="text-sm leading-relaxed text-ink">
            <span className="font-semibold text-forest">
              Nothing goes public yet.
            </span>{" "}
            Your company stays private until you submit it for verification and
            we have checked it.
          </p>
        </div>

        {error && (
          <p className="mt-5 rounded-lg border-l-2 border-gold bg-sand px-4 py-3 text-sm text-ink">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={state === "saving"}
          className="btn-lift mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-forest py-4 font-medium text-paper transition-colors hover:bg-gold hover:text-forest-deep disabled:opacity-60"
        >
          {state === "saving" ? "Saving" : "Create company"}
          {state !== "saving" && <span aria-hidden="true">&rarr;</span>}
        </button>
      </form>
    </div>
  );
}
