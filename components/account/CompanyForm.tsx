"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES } from "@/lib/countries";
import { createCompany } from "@/app/(site)/account/company/new/actions";

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

export default function CompanyForm({
  defaultEmail,
}: {
  defaultEmail: string | null;
}) {
  const router = useRouter();
  const [type, setType] = useState<string>("supplier");
  const [state, setState] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState("");

  /**
   * The write happens on the server, in createCompany.
   *
   * The browser does not talk to Supabase here. It hands the typed values to
   * a server action, which reads the session from the cookie and sets
   * created_by itself. That is what makes the companies_insert policy pass,
   * and it keeps the client from being able to name whose company this is.
   */
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "");

    setState("saving");
    setError("");

    const result = await createCompany({
      companyType: type,
      legalName: text("legalName"),
      tradingName: text("tradingName"),
      countryCode: text("countryCode"),
      city: text("city"),
      registrationNumber: text("registrationNumber"),
      contactEmail: text("contactEmail"),
      contactPhone: text("contactPhone"),
      shortDescription: text("shortDescription"),
    }).catch(() => ({
      ok: false as const,
      message:
        "We could not reach the server just now. Please try again, or email info@afrilynq.co.uk.",
    }));

    if (!result.ok) {
      setState("idle");
      setError(result.message);
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
