"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES } from "@/lib/countries";
import {
  createProduct,
  saveProduct,
  type ProductInput,
} from "@/app/(site)/account/products/actions";
import type { ProductDetail, Reference } from "@/lib/supabase-server";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** The terms that actually come up in African agricultural export. */
const INCOTERMS = [
  { code: "EXW", label: "EXW, buyer collects" },
  { code: "FCA", label: "FCA, free carrier" },
  { code: "FOB", label: "FOB, free on board" },
  { code: "CFR", label: "CFR, cost and freight" },
  { code: "CIF", label: "CIF, cost insurance freight" },
  { code: "CPT", label: "CPT, carriage paid to" },
  { code: "DAP", label: "DAP, delivered at place" },
  { code: "DDP", label: "DDP, delivered duty paid" },
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

/** Minor units back to something a person would type. */
function toDecimal(minor: number | null, minorUnits: number) {
  if (minor === null) return "";
  return (minor / 10 ** minorUnits).toFixed(minorUnits);
}

export default function ProductForm({
  companyId,
  product,
  reference,
}: {
  companyId: string;
  product: ProductDetail | null;
  reference: Reference;
}) {
  const router = useRouter();
  const editing = Boolean(product);

  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  const [months, setMonths] = useState<number[]>(product?.harvest_months ?? []);
  const [terms, setTerms] = useState<string[]>(product?.incoterms ?? []);
  const [currency, setCurrency] = useState(product?.price_currency ?? "");

  const minorUnits =
    reference.currencies.find((c) => c.code === currency)?.minor_units ?? 2;

  function toggle<T>(list: T[], value: T, set: (next: T[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = (n: string) => String(data.get(n) ?? "");

    setState("saving");
    setError("");

    const input: ProductInput = {
      companyId,
      productId: product?.id,
      categoryId: text("categoryId"),
      name: text("name"),
      summary: text("summary"),
      description: text("description"),
      status: text("status"),
      unitCode: text("unitCode"),
      minOrderQuantity: text("minOrderQuantity"),
      maxMonthlyCapacity: text("maxMonthlyCapacity"),
      leadTimeDays: text("leadTimeDays"),
      originCountryCode: text("originCountryCode"),
      originRegion: text("originRegion"),
      harvestMonths: months,
      packaging: text("packaging"),
      shelfLifeDays: text("shelfLifeDays"),
      incoterms: terms,
      priceCurrency: text("priceCurrency"),
      priceMin: text("priceMin"),
      priceMax: text("priceMax"),
      priceIsPublic: data.get("priceIsPublic") === "on",
    };

    const result = await (editing ? saveProduct(input) : createProduct(input)).catch(
      () => ({
        ok: false as const,
        message: "We could not reach the server just now. Please try again.",
      })
    );

    if (!result.ok) {
      setState("idle");
      setError(result.message);
      return;
    }

    if (!editing) {
      // Straight into the edit view, where the photographs can be added.
      // A newly created listing with no images is the common half-done
      // state, so the next step should be in front of them.
      router.push(`/account/products/${result.id}`);
      return;
    }

    setState("saved");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card title="What you are listing">
        <label className="block">
          <span className={label}>
            Name <span className="text-gold">*</span>
          </span>
          <input
            type="text"
            name="name"
            required
            defaultValue={product?.name ?? ""}
            placeholder="Natural sesame seed, 99.5 percent purity"
            className={field}
          />
          <span className={hint}>What a buyer would search for</span>
        </label>

        <label className="mt-5 block">
          <span className={label}>
            Category <span className="text-gold">*</span>
          </span>
          <select
            name="categoryId"
            required
            defaultValue={product?.category_id ?? ""}
            className={field}
          >
            <option value="">Choose a category</option>
            {reference.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-5 block">
          <span className={label}>In a line</span>
          <textarea
            name="summary"
            rows={2}
            maxLength={280}
            defaultValue={product?.summary ?? ""}
            placeholder="Cleaned and sorted white sesame from Jigawa, available from November."
            className={field}
          />
          <span className={hint}>Shown on the listing card in the catalogue</span>
        </label>

        <label className="mt-5 block">
          <span className={label}>The detail</span>
          <textarea
            name="description"
            rows={8}
            defaultValue={product?.description ?? ""}
            placeholder="Specification, grading, moisture content, how it is cleaned, how it is stored, what standards it meets."
            className={field}
          />
          <span className={hint}>
            What a serious buyer reads before sending an enquiry. Specifics
            win enquiries, adjectives do not.
          </span>
        </label>
      </Card>

      <Card
        title="Trade terms"
        note="The questions a buyer asks first. Leave anything blank rather than guessing."
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <label>
            <span className={label}>
              Sold by <span className="text-gold">*</span>
            </span>
            <select
              name="unitCode"
              required
              defaultValue={product?.unit_code ?? ""}
              className={field}
            >
              <option value="">Choose a unit</option>
              {reference.units.map((u) => (
                <option key={u.code} value={u.code}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={label}>Minimum order</span>
            <input
              type="text"
              inputMode="decimal"
              name="minOrderQuantity"
              defaultValue={product?.min_order_quantity ?? ""}
              placeholder="20"
              className={field}
            />
            <span className={hint}>In the unit above</span>
          </label>

          <label>
            <span className={label}>Monthly capacity</span>
            <input
              type="text"
              inputMode="decimal"
              name="maxMonthlyCapacity"
              defaultValue={product?.max_monthly_capacity ?? ""}
              placeholder="400"
              className={field}
            />
            <span className={hint}>Most you can ship in a month</span>
          </label>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <label>
            <span className={label}>Lead time</span>
            <input
              type="number"
              min={0}
              name="leadTimeDays"
              defaultValue={product?.lead_time_days ?? ""}
              placeholder="21"
              className={field}
            />
            <span className={hint}>Days from order to dispatch</span>
          </label>

          <label>
            <span className={label}>Shelf life</span>
            <input
              type="number"
              min={0}
              name="shelfLifeDays"
              defaultValue={product?.shelf_life_days ?? ""}
              placeholder="365"
              className={field}
            />
            <span className={hint}>Days</span>
          </label>

          <label>
            <span className={label}>Packaging</span>
            <input
              type="text"
              name="packaging"
              defaultValue={product?.packaging ?? ""}
              placeholder="50kg polypropylene bags"
              className={field}
            />
          </label>
        </div>

        <fieldset className="mt-6">
          <legend className={label}>Terms you can ship on</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {INCOTERMS.map((t) => (
              <label
                key={t.code}
                className={
                  "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm transition-colors " +
                  (terms.includes(t.code)
                    ? "border-gold bg-gold/8 text-ink"
                    : "border-sand-deep text-ink-soft hover:border-gold/50")
                }
              >
                <input
                  type="checkbox"
                  checked={terms.includes(t.code)}
                  onChange={() => toggle(terms, t.code, setTerms)}
                  className="accent-[var(--color-gold)]"
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card
        title="Origin and season"
        note="Buyers filter by where produce comes from, and the season explorer on the site is built from harvest months."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            <span className={label}>Country of origin</span>
            <select
              name="originCountryCode"
              defaultValue={product?.origin_country_code ?? ""}
              className={field}
            >
              <option value="">Not set</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={label}>Region or state</span>
            <input
              type="text"
              name="originRegion"
              defaultValue={product?.origin_region ?? ""}
              placeholder="Jigawa"
              className={field}
            />
          </label>
        </div>

        <fieldset className="mt-6">
          <legend className={label}>Harvest months</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {MONTHS.map((m, i) => {
              const value = i + 1;
              const on = months.includes(value);
              return (
                <label
                  key={m}
                  className={
                    "cursor-pointer rounded-lg border px-3.5 py-2 text-sm transition-colors " +
                    (on
                      ? "border-gold bg-gold/10 font-medium text-forest"
                      : "border-sand-deep text-ink-soft hover:border-gold/50")
                  }
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(months, value, setMonths)}
                    className="sr-only"
                  />
                  {m}
                </label>
              );
            })}
          </div>
          <span className={hint}>Leave all unticked if you supply year round</span>
        </fieldset>
      </Card>

      <Card
        title="Price"
        note="A range is fine, and more honest than one number for produce that moves with the season. You can keep it off the public listing and give it on enquiry."
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <label>
            <span className={label}>Currency</span>
            <select
              name="priceCurrency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={field}
            >
              <option value="">Not set</option>
              {reference.currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}, {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={label}>From</span>
            <input
              type="text"
              inputMode="decimal"
              name="priceMin"
              defaultValue={toDecimal(product?.price_min_minor ?? null, minorUnits)}
              placeholder="1200.00"
              className={field}
            />
            <span className={hint}>Per unit</span>
          </label>

          <label>
            <span className={label}>To</span>
            <input
              type="text"
              inputMode="decimal"
              name="priceMax"
              defaultValue={toDecimal(product?.price_max_minor ?? null, minorUnits)}
              placeholder="1450.00"
              className={field}
            />
            <span className={hint}>Leave blank for one price</span>
          </label>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-sand-deep px-4 py-3.5">
          <input
            type="checkbox"
            name="priceIsPublic"
            defaultChecked={product?.price_is_public ?? true}
            className="mt-1 accent-[var(--color-gold)]"
          />
          <span>
            <span className="block font-medium text-ink">Show the price publicly</span>
            <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
              Unticked, buyers see "Price on enquiry" and have to contact you.
              That means fewer enquiries, but the ones you get are serious.
            </span>
          </span>
        </label>
      </Card>

      <Card title="Publishing">
        <label className="block max-w-sm">
          <span className={label}>Status</span>
          <select
            name="status"
            defaultValue={product?.status ?? "draft"}
            className={field}
          >
            <option value="draft">Draft, only you can see it</option>
            <option value="active">Published</option>
            <option value="archived">Archived, taken down</option>
          </select>
        </label>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
          A published listing appears in the catalogue once your company is
          verified. Until then it stays private no matter what you set here.
        </p>
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

      <button
        type="submit"
        disabled={state === "saving"}
        className="btn-lift rounded-lg bg-forest px-6 py-3 font-medium text-paper transition-colors hover:bg-gold hover:text-forest-deep disabled:opacity-60"
      >
        {state === "saving"
          ? "Saving"
          : editing
            ? "Save changes"
            : "Create listing"}
      </button>
    </form>
  );
}
