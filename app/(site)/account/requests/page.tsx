import type { Metadata } from "next";
import Link from "next/link";
import { userCompanies, sessionClient } from "@/lib/supabase-server";
import { COUNTRIES } from "@/lib/countries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My requests",
  robots: { index: false, follow: false },
};

/**
 * What the buyer has asked for, and who has come back.
 *
 * The mirror of the supplier's enquiry inbox. The quote count beside each
 * row is the number that matters: a request with no quotes after a week is
 * usually specified too tightly or sent to one supplier.
 */

interface Row {
  id: string;
  reference: string | null;
  supplier_company_id: string;
  product_name_snapshot: string | null;
  quantity: number | null;
  unit_code: string | null;
  required_by: string | null;
  delivery_country_code: string | null;
  delivery_city: string | null;
  incoterm: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-gold/15 text-gold-deep" },
  quoted: { label: "Quotes in", cls: "bg-forest/10 text-forest" },
  closed: { label: "Closed", cls: "bg-sand-deep text-stone" },
  cancelled: { label: "Cancelled", cls: "bg-sand-deep text-stone" },
};

function day(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function RequestsPage() {
  const companies = await userCompanies();
  const ids = companies.map((c) => c.id);

  let rows: Row[] = [];
  let quotesPer: Record<string, number> = {};

  if (ids.length > 0) {
    const supabase = await sessionClient();

    const { data } = await supabase
      .from("enquiries")
      .select(
        "id, reference, supplier_company_id, product_name_snapshot, quantity, unit_code, required_by, delivery_country_code, delivery_city, incoterm, message, status, created_at"
      )
      .in("buyer_company_id", ids)
      .order("created_at", { ascending: false })
      .limit(100);

    rows = (data ?? []) as Row[];

    if (rows.length > 0) {
      const { data: quotes } = await supabase
        .from("quotations")
        .select("enquiry_id")
        .in(
          "enquiry_id",
          rows.map((r) => r.id)
        )
        .neq("status", "draft");

      quotesPer = ((quotes ?? []) as { enquiry_id: string }[]).reduce(
        (acc, q) => {
          acc[q.enquiry_id] = (acc[q.enquiry_id] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    }
  }

  const countryName = new Map(COUNTRIES.map((c) => [c.code, c.name]));
  const open = rows.filter((r) => r.status === "open" || r.status === "quoted").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl">My requests</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Everything you have asked suppliers for, and what has come back.
          </p>
        </div>
        <Link
          href="/marketplace"
          className="btn-lift shrink-0 rounded-lg bg-forest px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-gold hover:text-forest-deep"
        >
          Find something to request
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-sand-deep bg-paper p-8 shadow-sm">
          <h3 className="text-xl">You have not asked for anything yet</h3>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
            Find a listing in the marketplace and use "Ask for a price". Tell
            the supplier how much you need, by when and on what terms, and
            your request appears here with their reply.
          </p>
          <Link href="/marketplace" className="btn-lift btn-primary mt-7 inline-block">
            Browse the marketplace
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-soft">
            {open === 0
              ? "Nothing open at the moment."
              : `${open} still open.`}
          </p>

          <ul className="space-y-3">
            {rows.map((r) => {
              const s = STATUS[r.status] ?? STATUS.open;
              const n = quotesPer[r.id] ?? 0;
              const terms = [
                r.incoterm,
                [r.delivery_city, countryName.get(r.delivery_country_code ?? "")]
                  .filter(Boolean)
                  .join(", ") || null,
                r.required_by ? `needed by ${day(r.required_by)}` : null,
              ].filter(Boolean);

              return (
                <li
                  key={r.id}
                  className="rounded-xl border border-sand-deep bg-paper p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <h3 className="text-lg font-medium text-ink">
                        {r.product_name_snapshot ?? "Product request"}
                        {r.quantity != null && (
                          <span className="font-normal text-ink-soft">
                            {", "}
                            {Number(r.quantity).toLocaleString("en-GB")} {r.unit_code}
                          </span>
                        )}
                      </h3>
                      {terms.length > 0 && (
                        <p className="mt-1 text-sm text-stone">{terms.join(" · ")}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${s.cls}`}>
                        {s.label}
                      </span>
                      <span className="text-sm text-ink-soft">
                        {n === 0 ? "No quotes" : n === 1 ? "1 quote" : `${n} quotes`}
                      </span>
                    </div>
                  </div>

                  {r.message && (
                    <p className="mt-3 leading-relaxed text-ink-soft">{r.message}</p>
                  )}

                  <p className="mt-2 text-xs text-stone">
                    {r.reference} &middot; sent {day(r.created_at)}
                  </p>
                </li>
              );
            })}
          </ul>

          <p className="rounded-xl border border-sand-deep bg-sand/60 px-5 py-4 text-sm leading-relaxed text-ink-soft">
            Reading and comparing quotations arrives in Stage 3. Until then a
            supplier who wants to quote will reply to you directly.
          </p>
        </>
      )}
    </div>
  );
}
