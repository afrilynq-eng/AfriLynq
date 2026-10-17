import type { Metadata } from "next";
import { userCompanies, sessionClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enquiries",
  robots: { index: false, follow: false },
};

interface Row {
  id: string;
  reference: string | null;
  product_name_snapshot: string | null;
  quantity: number | null;
  unit_code: string | null;
  required_by: string | null;
  delivery_country_code: string | null;
  delivery_city: string | null;
  incoterm: string | null;
  status: string;
  created_at: string;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "New", cls: "bg-gold/15 text-gold-deep" },
  quoted: { label: "Quote sent", cls: "bg-forest/10 text-forest" },
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

export default async function EnquiriesPage() {
  const companies = await userCompanies();
  const ids = companies.map((c) => c.id);

  let rows: Row[] = [];
  if (ids.length > 0) {
    const supabase = await sessionClient();
    const { data } = await supabase
      .from("enquiries")
      .select(
        "id, reference, product_name_snapshot, quantity, unit_code, required_by, delivery_country_code, delivery_city, incoterm, status, created_at"
      )
      .in("supplier_company_id", ids)
      .order("created_at", { ascending: false })
      .limit(100);
    rows = (data ?? []) as Row[];
  }

  return (
    <>
      <h2 className="text-2xl">Buyer enquiries</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Requests buyers have sent to your company.
      </p>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-sand-deep bg-paper p-8 shadow-sm">
          <h3 className="text-xl">No enquiries yet</h3>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
            Buyers can send you a request once your company is verified and
            your products are listed. It will appear here the moment it arrives.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((r) => {
            const s = STATUS[r.status] ?? STATUS.open;
            return (
              <li key={r.id} className="rounded-xl border border-sand-deep bg-paper p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-stone">{r.reference ?? "Enquiry"}</p>
                    <h3 className="text-lg">{r.product_name_snapshot ?? "Product enquiry"}</h3>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-medium ${s.cls}`}>{s.label}</span>
                </div>
                <p className="mt-2 text-sm text-ink-soft">
                  {[
                    r.quantity != null ? `${r.quantity} ${r.unit_code ?? ""}`.trim() : null,
                    [r.delivery_city, r.delivery_country_code].filter(Boolean).join(", ") || null,
                    r.incoterm,
                    r.required_by ? `needed by ${day(r.required_by)}` : null,
                    `received ${day(r.created_at)}`,
                  ]
                    .filter(Boolean)
                    .join(" . ")}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
