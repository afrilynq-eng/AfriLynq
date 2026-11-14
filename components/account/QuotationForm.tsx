"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * The supplier's quotation.
 *
 * Lines are managed in the browser because a quotation is not one price:
 * a buyer asking for cashews may be quoted two grades at different
 * prices, or a product plus its packaging. The form opens with a single
 * line prefilled from what the buyer actually asked for, which is the
 * common case and saves retyping it.
 *
 * The running total is shown as it is typed. The server recomputes it
 * from the lines regardless, because a total posted from a browser is a
 * number the supplier could have edited.
 */

export interface Option {
  code: string;
  name: string;
}

interface LineState {
  key: number;
  description: string;
  quantity: string;
  unit: string;
  price: string;
}

const label = "block text-xs font-semibold tracking-wide text-stone uppercase";
const field =
  "mt-1.5 w-full rounded-lg border border-sand-deep bg-paper px-3.5 py-2.5 text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30";

export default function QuotationForm({
  action,
  units,
  currencies,
  prefill,
  enquiryRef,
  minorUnitsByCurrency,
}: {
  action: (formData: FormData) => void;
  units: Option[];
  currencies: Option[];
  prefill: {
    description: string;
    quantity: string;
    unit: string;
    currency: string;
    incoterm: string | null;
  };
  enquiryRef: string;
  minorUnitsByCurrency: Record<string, number>;
}) {
  const [lines, setLines] = useState<LineState[]>([
    {
      key: 1,
      description: prefill.description,
      quantity: prefill.quantity,
      unit: prefill.unit,
      price: "",
    },
  ]);
  const [currency, setCurrency] = useState(prefill.currency);
  const [shipping, setShipping] = useState("");
  const [other, setOther] = useState("");

  const minor = minorUnitsByCurrency[currency] ?? 2;
  const num = (s: string) => {
    const n = Number(s.replace(/,/g, "").trim());
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const subtotal = lines.reduce((sum, l) => sum + num(l.quantity) * num(l.price), 0);
  const total = subtotal + num(shipping) + num(other);
  const show = (n: number) =>
    n.toLocaleString("en-GB", {
      minimumFractionDigits: minor,
      maximumFractionDigits: minor,
    });

  function update(key: number, patch: Partial<LineState>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  return (
    <form action={action}>
      <section className="rounded-xl border border-sand-deep bg-paper p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-xl">What you are quoting</h2>
          <label className="w-40">
            <span className={label}>Currency</span>
            <select
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={field}
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 space-y-4">
          {lines.map((l, i) => (
            <div
              key={l.key}
              className="rounded-lg border border-sand bg-sand/30 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs font-semibold tracking-wide text-stone uppercase">
                  Line {i + 1}
                </span>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                    className="link-quiet text-xs text-stone hover:text-ink"
                  >
                    Remove
                  </button>
                )}
              </div>

              <label className="mt-2 block">
                <span className={label}>Description</span>
                <input
                  name="line_description"
                  value={l.description}
                  onChange={(e) => update(l.key, { description: e.target.value })}
                  required
                  placeholder="Grade A raw cashew nuts, 2026 crop"
                  className={field}
                />
              </label>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label>
                  <span className={label}>Quantity</span>
                  <input
                    name="line_quantity"
                    value={l.quantity}
                    onChange={(e) => update(l.key, { quantity: e.target.value })}
                    inputMode="decimal"
                    required
                    className={field}
                  />
                </label>
                <label>
                  <span className={label}>Unit</span>
                  <select
                    name="line_unit"
                    value={l.unit}
                    onChange={(e) => update(l.key, { unit: e.target.value })}
                    className={field}
                  >
                    {units.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={label}>Price per unit</span>
                  <input
                    name="line_price"
                    value={l.price}
                    onChange={(e) => update(l.key, { price: e.target.value })}
                    inputMode="decimal"
                    required
                    placeholder="0.00"
                    className={field}
                  />
                </label>
              </div>

              <p className="mt-2.5 text-right text-sm text-ink-soft">
                Line total{" "}
                <span className="tabular font-medium text-ink">
                  {currency} {show(num(l.quantity) * num(l.price))}
                </span>
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() =>
            setLines((ls) => [
              ...ls,
              {
                key: Math.max(0, ...ls.map((x) => x.key)) + 1,
                description: "",
                quantity: "",
                unit: prefill.unit,
                price: "",
              },
            ])
          }
          className="btn-lift btn-ghost mt-4"
        >
          Add another line
        </button>

        <div className="mt-6 grid gap-4 border-t border-sand pt-5 sm:grid-cols-2">
          <label>
            <span className={label}>Shipping</span>
            <input
              name="shipping"
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className={field}
            />
          </label>
          <label>
            <span className={label}>Other charges</span>
            <input
              name="other_charges"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className={field}
            />
          </label>
        </div>

        <div className="mt-5 flex items-end justify-between border-t border-sand-deep pt-4">
          <span className="text-sm text-ink-soft">Total</span>
          <span className="tabular text-2xl font-semibold text-forest">
            {currency} {show(total)}
          </span>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-sand-deep bg-paper p-6 shadow-sm">
        <h2 className="text-xl">Terms</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          These travel with the quotation and cannot be changed once it is
          sent. A different price or term means a new quotation, which is
          what a buyer comparing offers needs.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            <span className={label}>Incoterm</span>
            <input
              name="incoterm"
              defaultValue={prefill.incoterm ?? ""}
              placeholder="FOB Lomé"
              className={field}
            />
          </label>
          <label>
            <span className={label}>Lead time in days</span>
            <input
              name="lead_time_days"
              inputMode="numeric"
              placeholder="21"
              className={field}
            />
          </label>
          <label>
            <span className={label}>Payment terms</span>
            <input
              name="payment_terms"
              placeholder="30% on order, balance against documents"
              className={field}
            />
          </label>
          <label>
            <span className={label}>Valid until</span>
            <input type="date" name="valid_until" className={field} />
          </label>
        </div>

        <label className="mt-4 block">
          <span className={label}>Packaging</span>
          <input
            name="packaging_notes"
            placeholder="50kg jute sacks, palletised"
            className={field}
          />
        </label>

        <label className="mt-4 block">
          <span className={label}>Anything else the buyer should know</span>
          <textarea name="notes" rows={4} className={field} />
        </label>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="submit" className="btn-lift btn-primary">
          Send this quotation
        </button>
        <Link href="/account/enquiries" className="link-quiet text-ink-soft">
          Cancel
        </Link>
        <span className="text-sm text-stone">
          Against enquiry {enquiryRef}. The buyer is told as soon as you send.
        </span>
      </div>
    </form>
  );
}
