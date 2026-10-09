"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { COUNTRIES } from "@/lib/countries";
import { browserClient } from "@/lib/supabase-browser";
import {
  saveCompany,
  prepareLogo,
  saveLogoPath,
  type CompanyInput,
} from "@/app/(site)/account/company/actions";
import type { CompanyDetail } from "@/lib/supabase-server";

const LOGO_BUCKET = "company-public";
const MAX_LOGO = 5 * 1024 * 1024;

const TYPES = [
  { value: "supplier", label: "We supply produce" },
  { value: "buyer", label: "We buy produce" },
  { value: "both", label: "We do both" },
];

const BANDS = [
  { value: "", label: "Not saying" },
  { value: "1-9", label: "1 to 9 people" },
  { value: "10-49", label: "10 to 49 people" },
  { value: "50-199", label: "50 to 199 people" },
  { value: "200-499", label: "200 to 499 people" },
  { value: "500+", label: "500 or more" },
];

const label =
  "block text-[0.7rem] font-semibold tracking-widest text-forest uppercase";
const field =
  "mt-2 w-full rounded-lg border border-sand-deep bg-paper px-4 py-3 text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30";
const hint = "mt-1.5 block text-xs text-stone";

function Card({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
      <h2 className="text-xl">{title}</h2>
      {note && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{note}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function CompanyProfileForm({
  company,
  logoUrl,
}: {
  company: CompanyDetail;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [logo, setLogo] = useState(logoUrl);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = (n: string) => String(data.get(n) ?? "");

    setState("saving");
    setError("");

    const input: CompanyInput = {
      companyId: company.id,
      legalName: text("legalName"),
      tradingName: text("tradingName"),
      companyType: text("companyType"),
      registrationNumber: text("registrationNumber"),
      taxNumber: text("taxNumber"),
      countryCode: text("countryCode"),
      stateOrRegion: text("stateOrRegion"),
      city: text("city"),
      addressLine1: text("addressLine1"),
      addressLine2: text("addressLine2"),
      postcode: text("postcode"),
      contactEmail: text("contactEmail"),
      contactPhone: text("contactPhone"),
      websiteUrl: text("websiteUrl"),
      shortDescription: text("shortDescription"),
      about: text("about"),
      yearEstablished: text("yearEstablished"),
      employeeBand: text("employeeBand"),
    };

    const result = await saveCompany(input).catch(() => ({
      ok: false as const,
      message: "We could not reach the server just now. Please try again.",
    }));

    if (!result.ok) {
      setState("idle");
      setError(result.message);
      return;
    }

    setState("saved");
    router.refresh();
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_LOGO) {
      setLogoError("That image is larger than 5MB. Please use a smaller one.");
      e.target.value = "";
      return;
    }

    setLogoBusy(true);
    setLogoError("");

    try {
      const prepared = await prepareLogo(company.id, file.name);
      if (!prepared.ok) throw new Error(prepared.message);

      const supabase = browserClient();
      const { error: upErr } = await supabase.storage
        .from(LOGO_BUCKET)
        .uploadToSignedUrl(prepared.path, prepared.token, file);
      if (upErr) throw new Error(upErr.message);

      const saved = await saveLogoPath(company.id, prepared.path);
      if (!saved.ok) throw new Error(saved.message);

      const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(prepared.path);
      setLogo(data.publicUrl);
      router.refresh();
    } catch (err) {
      setLogoError(
        err instanceof Error ? err.message : "The upload did not complete."
      );
    } finally {
      setLogoBusy(false);
      e.target.value = "";
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* ---------- Logo ---------- */}
      <Card
        title="Logo"
        note="Shown beside your name in the directory and on every enquiry you send. A square image works best."
      >
        <div className="flex flex-wrap items-center gap-6">
          <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-sand-deep bg-sand">
            {logo ? (
              <Image
                src={logo}
                alt=""
                width={96}
                height={96}
                unoptimized
                className="h-24 w-24 object-contain"
              />
            ) : (
              <span className="text-xs text-stone">No logo</span>
            )}
          </span>

          <div>
            <label className="btn-lift inline-block cursor-pointer rounded-lg border border-sand-deep px-5 py-2.5 text-sm font-medium text-forest transition-colors hover:border-forest">
              {logoBusy ? "Uploading" : logo ? "Replace logo" : "Upload a logo"}
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg"
                onChange={uploadLogo}
                disabled={logoBusy}
                className="hidden"
              />
            </label>
            <span className={hint}>PNG, JPG, WEBP or SVG, up to 5MB</span>
            {logoError && (
              <p className="mt-3 rounded-lg border-l-2 border-gold bg-sand px-4 py-2.5 text-sm text-ink">
                {logoError}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* ---------- Identity ---------- */}
      <Card title="The business">
        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            <span className={label}>
              Registered company name <span className="text-gold">*</span>
            </span>
            <input
              type="text"
              name="legalName"
              required
              defaultValue={company.legal_name}
              className={field}
            />
            <span className={hint}>Exactly as it appears on your registration</span>
          </label>

          <label>
            <span className={label}>Trading name</span>
            <input
              type="text"
              name="tradingName"
              defaultValue={company.trading_name ?? ""}
              className={field}
            />
            <span className={hint}>This is the name buyers see</span>
          </label>
        </div>

        <label className="mt-5 block">
          <span className={label}>What you do</span>
          <select
            name="companyType"
            defaultValue={company.company_type}
            className={field}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label>
            <span className={label}>Registration number</span>
            <input
              type="text"
              name="registrationNumber"
              defaultValue={company.registration_number ?? ""}
              className={field}
            />
            <span className={hint}>Needed before verification</span>
          </label>

          <label>
            <span className={label}>Tax number</span>
            <input
              type="text"
              name="taxNumber"
              defaultValue={company.tax_number ?? ""}
              className={field}
            />
          </label>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label>
            <span className={label}>Year established</span>
            <input
              type="number"
              name="yearEstablished"
              min={1800}
              max={new Date().getFullYear()}
              defaultValue={company.year_established ?? ""}
              placeholder="2019"
              className={field}
            />
          </label>

          <label>
            <span className={label}>People</span>
            <select
              name="employeeBand"
              defaultValue={company.employee_band ?? ""}
              className={field}
            >
              {BANDS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {/* ---------- Where ---------- */}
      <Card
        title="Where you are"
        note="Buyers filter by country, and a supplier with no location does not appear in those results."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            <span className={label}>
              Country <span className="text-gold">*</span>
            </span>
            <select
              name="countryCode"
              required
              defaultValue={company.country_code ?? ""}
              className={field}
            >
              <option value="">Select a country</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={label}>State or region</span>
            <input
              type="text"
              name="stateOrRegion"
              defaultValue={company.state_or_region ?? ""}
              className={field}
            />
          </label>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label>
            <span className={label}>City or town</span>
            <input
              type="text"
              name="city"
              defaultValue={company.city ?? ""}
              className={field}
            />
          </label>

          <label>
            <span className={label}>Postcode</span>
            <input
              type="text"
              name="postcode"
              defaultValue={company.postcode ?? ""}
              className={field}
            />
          </label>
        </div>

        <label className="mt-5 block">
          <span className={label}>Address</span>
          <input
            type="text"
            name="addressLine1"
            defaultValue={company.address_line1 ?? ""}
            placeholder="Street address"
            className={field}
          />
        </label>

        <label className="mt-3 block">
          <span className="sr-only">Address line two</span>
          <input
            type="text"
            name="addressLine2"
            defaultValue={company.address_line2 ?? ""}
            placeholder="Anything else"
            className={field}
          />
        </label>
      </Card>

      {/* ---------- Contact ---------- */}
      <Card
        title="How buyers reach you"
        note="This is the company's public contact, not your personal sign in address."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            <span className={label}>Email</span>
            <input
              type="email"
              name="contactEmail"
              defaultValue={company.contact_email ?? ""}
              className={field}
            />
          </label>

          <label>
            <span className={label}>Phone</span>
            <input
              type="tel"
              name="contactPhone"
              defaultValue={company.contact_phone ?? ""}
              placeholder="Including country code"
              className={field}
            />
          </label>
        </div>

        <label className="mt-5 block">
          <span className={label}>Website</span>
          <input
            type="text"
            name="websiteUrl"
            defaultValue={company.website_url ?? ""}
            placeholder="yourcompany.com"
            className={field}
          />
          <span className={hint}>No need to type https, we add it</span>
        </label>
      </Card>

      {/* ---------- About ---------- */}
      <Card title="About the company">
        <label className="block">
          <span className={label}>In a line</span>
          <textarea
            name="shortDescription"
            rows={2}
            maxLength={280}
            defaultValue={company.short_description ?? ""}
            placeholder="A sesame and hibiscus exporter in Jigawa, shipping since 2019."
            className={field}
          />
          <span className={hint}>Shown under your name in the directory</span>
        </label>

        <label className="mt-5 block">
          <span className={label}>The longer version</span>
          <textarea
            name="about"
            rows={7}
            defaultValue={company.about ?? ""}
            placeholder="What you grow or source, how much you can ship, the standards you work to, who you already supply."
            className={field}
          />
          <span className={hint}>
            Shown on your profile page. What a buyer reads before deciding
            whether to send an enquiry.
          </span>
        </label>
      </Card>

      {error && (
        <p className="rounded-lg border-l-2 border-gold bg-sand px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}

      {state === "saved" && !error && (
        <p className="rounded-lg border-l-2 border-forest bg-sand px-4 py-3 text-sm text-ink">
          Saved.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={state === "saving"}
          className="btn-lift rounded-lg bg-forest px-6 py-3 font-medium text-paper transition-colors hover:bg-gold hover:text-forest-deep disabled:opacity-60"
        >
          {state === "saving" ? "Saving" : "Save changes"}
        </button>

        {company.verification_status === "verified" && (
          <span className="text-sm text-stone">
            Changes to a verified company go live immediately.
          </span>
        )}
      </div>
    </form>
  );
}
