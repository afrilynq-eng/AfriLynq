import type { Metadata } from "next";
import Link from "next/link";
import { userCompanies, sessionClient } from "@/lib/supabase-server";
import { COUNTRIES } from "@/lib/countries";
import EnquiryActions from "@/components/account/EnquiryActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buyer enquiries",
  robots: { index: false, follow: false },
};

/**
 * Every request a buyer has sent, grouped under the listing it is about.
 *
 * Grouped rather than a flat list because a supplier thinks in products:
 * four enquiries about beans is one conversation to have, not four
 * unrelated jobs, and seeing them together is what tells them the beans
 * are the thing worth stocking.
 *
 * The rows come from supplier_enquiry_inbox rather than the enquiries
 * table, because the buyer's name and city live on a company row that row
 * level security will not show a supplier directly.
 */

interface Row {
  id: string;
  reference: string | null;
  product_id: string | null;
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
  buyer_name: string;
  buyer_type: string;
  buyer_city: string | null;
  buyer_country_code: string | null;
  buyer_verified: boolean;
  buyer_contact_email: string | null;
  buyer_contact_phone: string | null;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "New", cls: "bg-forest/10 text-forest" },
  quoted: { label: "Quote sent", cls: "bg-gold/15 text-gold-deep" },
  closed: { label: "Closed", cls: "bg-sand-deep text-stone" },
  cancelled: { label: "Cancelled", cls: "bg-sand-deep text-stone" },
};

const BUYER_TYPE: Record<string, string> = {
  buyer: "Retailer",
  supplier: "Supplier",
  both: "Supplier and retailer",
};

function day(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-sand-deep bg-paper p-5 shadow-sm">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-forest">{value}</p>
    </div>
  );
}

export default async function EnquiriesPage() {
  const companies = await userCompanies();
  const ids = companies.map((c) => c.id);

  let rows: Row[] = [];
  let quotesSent = 0;
  let awaiting = 0;
  let contracted = 0;

  if (ids.length > 0) {
    const supabase = await sessionClient();
    const head = { count: "exact" as const, head: true };

    const [inbox, sent, out, orders] = await Promise.all([
      supabase
        .from("supplier_enquiry_inbox")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("quotations")
        .select("id", head)
        .in("supplier_company_id", ids)
        .in("status", ["sent", "accepted", "rejected", "revision_requested", "expired"]),
      supabase
        .from("quotations")
        .select("id", head)
        .in("supplier_company_id", ids)
        .in("status", ["sent", "revision_requested"]),
      supabase.from("orders").select("id", head).in("supplier_company_id", ids),
    ]);

    rows = (inbox.data ?? []) as Row[];
    quotesSent = sent.count ?? 0;
    awaiting = out.count ?? 0;
    contracted = orders.count ?? 0;
  }

  const countryName = new Map(COUNTRIES.map((c) => [c.code, c.name]));
  const fresh = rows.filter((r) => r.status === "open").length;

  // Group under the listing. Enquiries whose product has since been deleted
  // keep the name that was snapshotted when they were sent.
  const groups = new Map<string, { title: string; rows: Row[] }>();
  for (const r of rows) {
    const key = r.product_id ?? r.product_name_snapshot ?? "other";
    if (!groups.has(key)) {
      groups.set(key, {
        title: r.product_name_snapshot ?? "General enquiries",
        rows: [],
      });
    }
    groups.get(key)!.rows.push(r);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl">Buyer enquiries</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Every buyer request for your products, grouped by listing.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="New enquiries" value={fresh} />
        <Stat label="Quotes sent" value={quotesSent} />
        <Stat label="Awaiting buyer" value={awaiting} />
        <Stat label="Contracted" value={contracted} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-sand-deep bg-paper p-8 shadow-sm">
          <h3 className="text-xl">No enquiries yet</h3>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
            Buyers can send you a request once your company is verified and
            your products are listed. It will appear here the moment it
            arrives, and you will get an email as well.
          </p>
          <Link href="/account/products" className="btn-lift btn-primary mt-7 inline-block">
            Check your listings
          </Link>
        </div>
      ) : (
        [...groups.values()].map((group) => (
          <section key={group.title} className="space-y-3">
            <h3 className="text-xl">{group.title}</h3>

            {group.rows.map((r) => {
              const s = STATUS[r.status] ?? STATUS.open;
              const where = [r.buyer_city, countryName.get(r.buyer_country_code ?? "")]
                .filter(Boolean)
                .join(", ");

              const ask = [
                r.quantity != null
                  ? `${Number(r.quantity).toLocaleString("en-GB")} ${r.unit_code ?? ""}`.trim()
                  : null,
                r.incoterm,
                [r.delivery_city, countryName.get(r.delivery_country_code ?? "")]
                  .filter(Boolean)
                  .join(", ") || null,
                r.required_by ? `needed by ${day(r.required_by)}` : null,
              ].filter(Boolean);

              return (
                <article
                  key={r.id}
                  className="rounded-xl border border-sand-deep bg-paper p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-lg font-medium text-ink">{r.buyer_name}</h4>
                      <p className="mt-1 text-sm text-stone">
                        {[
                          BUYER_TYPE[r.buyer_type] ?? r.buyer_type,
                          where || null,
                          r.buyer_verified ? "Verified buyer" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${s.cls}`}
                    >
                      {s.label}
                    </span>
                  </div>

                  {ask.length > 0 && (
                    <p className="mt-3 leading-relaxed text-ink">{ask.join(", ")}.</p>
                  )}

                  {r.message && (
                    <p className="mt-2 leading-relaxed text-ink-soft">{r.message}</p>
                  )}

                  <p className="mt-2 text-xs text-stone">
                    {r.reference} &middot; received {day(r.created_at)}
                  </p>

                  <EnquiryActions
                    enquiryId={r.id}
                    open={r.status === "open" || r.status === "quoted"}
                    contactEmail={r.buyer_contact_email}
                    contactPhone={r.buyer_contact_phone}
                  />
                </article>
              );
            })}
          </section>
        ))
      )}
    </div>
  );
}
