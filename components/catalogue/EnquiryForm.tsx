"use client";

import { useState } from "react";
import Link from "next/link";
import { createEnquiry } from "@/app/(site)/marketplace/[slug]/actions";
import { COUNTRIES } from "@/lib/countries";

/**
 * Asking a supplier for a price.
 *
 * Short on purpose. The fields here are the ones a supplier cannot quote
 * without: how much, by when, on what terms, to where. Everything else
 * goes in the message. A long form at this moment loses the buyer, and a
 * supplier would rather have four facts and a sentence than nothing.
 *
 * It opens closed, as a button, so the listing still reads as a listing.
 */

const INCOTERMS = ["EXW", "FCA", "FOB", "CFR", "CIF", "CPT", "DAP", "DDP"];

export default function EnquiryForm({
  productId,
  productName,
  supplierCompanyId,
  supplierName,
  unitCode,
  unitLabel,
}: {
  productId: string;
  productName: string;
  supplierCompanyId: string;
  supplierName: string;
  unitCode: string;
  unitLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentRef, setSentRef] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = (n: string) => String(data.get(n) ?? "").trim();

    setBusy(true);
    setError("");

    const result = await createEnquiry({
      productId,
      supplierCompanyId,
      productName,
      unitCode,
      quantity: text("quantity"),
      requiredBy: text("requiredBy"),
      incoterm: text("incoterm"),
      deliveryCity: text("deliveryCity"),
      deliveryCountryCode: text("deliveryCountryCode"),
      message: text("message"),
    }).catch(() => ({
      ok: false as const,
      message: "Could not reach the server. Try again.",
    }));

    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSentRef(result.reference);
  }

  if (sentRef) {
    return (
      <div className="mt-5 rounded-lg border border-forest/30 bg-forest/5 px-5 py-4">
        <p className="font-semibold text-forest">Sent to {supplierName}.</p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink">
          Your reference is {sentRef}. The supplier sees it on their enquiries
          screen and will reply to you directly. You can follow it under{" "}
          <Link href="/account/requests" className="link-quiet text-forest">
            my requests
          </Link>
          .
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-lift btn-primary mt-5"
      >
        Ask for a price
      </button>
    );
  }

  const label = "block text-[0.7rem] font-semibold tracking-widest text-forest uppercase";
  const field =
    "mt-1.5 w-full rounded-lg border border-sand-deep bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30";

  return (
    <form onSubmit={submit} className="mt-5 rounded-lg border border-sand-deep bg-sand/50 p-5">
      <p className="font-semibold text-forest">Ask {supplierName} for a price</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label>
          <span className={label}>
            How much <span className="text-gold">*</span>
          </span>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="number"
              name="quantity"
              required
              min="0"
              step="any"
              inputMode="decimal"
              className={field + " mt-0"}
            />
            <span className="shrink-0 text-sm text-stone">{unitLabel}</span>
          </div>
        </label>

        <label>
          <span className={label}>Needed by</span>
          <input type="date" name="requiredBy" className={field} />
        </label>

        <label>
          <span className={label}>Terms</span>
          <select name="incoterm" defaultValue="" className={field}>
            <option value="">Not sure yet</option>
            {INCOTERMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className={label}>Deliver to</span>
          <input type="text" name="deliveryCity" placeholder="City or port" className={field} />
        </label>

        <label className="sm:col-span-2">
          <span className={label}>Country</span>
          <select name="deliveryCountryCode" defaultValue="GB" className={field}>
            <option value="">Not sure yet</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="sm:col-span-2">
          <span className={label}>Anything else</span>
          <textarea
            name="message"
            rows={3}
            maxLength={2000}
            placeholder="Packaging, grade, certificates you need, whether this is a repeat order"
            className={field + " resize-y"}
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border-l-2 border-gold bg-paper px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="btn-lift btn-primary disabled:opacity-60">
          {busy ? "Sending" : "Send enquiry"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-sand-deep px-5 py-2.5 text-sm font-medium text-forest transition-colors hover:border-forest"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
