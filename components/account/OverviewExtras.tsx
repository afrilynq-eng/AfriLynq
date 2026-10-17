import Link from "next/link";
import {
  sessionClient,
  companyDetail,
  type MemberCompany,
} from "@/lib/supabase-server";

function Stat({
  label,
  value,
  caption,
}: {
  label: string;
  value: number;
  caption: string;
}) {
  return (
    <div className="rounded-xl border border-sand-deep bg-paper p-5 shadow-sm">
      <p className="text-[0.7rem] font-semibold tracking-widest text-stone uppercase">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-forest">{value}</p>
      <p className="mt-1 text-sm text-ink-soft">{caption}</p>
    </div>
  );
}

/**
 * Live numbers and a profile checklist for the signed in supplier.
 * Every query runs through the session client, so row level security limits
 * it to this person's companies.
 */
export default async function OverviewExtras({
  companyIds,
  primary,
}: {
  companyIds: string[];
  primary: MemberCompany;
}) {
  const supabase = await sessionClient();
  const detail = await companyDetail(primary.id);
  const verified = primary.verification_status === "verified";

  const head = { count: "exact" as const, head: true };
  const [active, anyListing, enquiries, quotes, docs, views] = await Promise.all([
    supabase.from("products").select("id", head).in("company_id", companyIds).eq("status", "active"),
    supabase.from("products").select("id", head).eq("company_id", primary.id),
    supabase.from("enquiries").select("id", head).in("supplier_company_id", companyIds).eq("status", "open"),
    supabase.from("quotations").select("id", head).in("supplier_company_id", companyIds).in("status", ["sent", "accepted"]),
    supabase.from("certifications").select("id", head).eq("company_id", primary.id),
    supabase.from("products").select("view_count").in("company_id", companyIds),
  ]);

  const totalViews = (views.data ?? []).reduce(
    (sum, r) => sum + (Number(r.view_count) || 0),
    0
  );
  const hidden = "Visible to buyers once you are verified";

  const checks = [
    { done: Boolean(detail?.logo_path), label: "Add your logo", href: "/account/company" },
    { done: Boolean(detail?.short_description?.trim()), label: "Add a one-line description", href: "/account/company" },
    { done: (detail?.about ?? "").trim().length >= 40, label: "Write the longer company description", href: "/account/company" },
    { done: Boolean(detail?.tax_number?.trim()), label: "Add your tax number", href: "/account/company" },
    { done: (docs.count ?? 0) > 0, label: "Upload a registration document or certificate", href: "/account/documents" },
    { done: (anyListing.count ?? 0) > 0, label: "Add your first listing", href: "/account/products/new" },
  ];
  const todo = checks.filter((c) => !c.done);
  const pct = Math.round(((checks.length - todo.length) / checks.length) * 100);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active listings" value={active.count ?? 0} caption={verified ? "Live in the directory" : hidden} />
        <Stat label="Open enquiries" value={enquiries.count ?? 0} caption="Waiting for your reply" />
        <Stat label="Quotes sent" value={quotes.count ?? 0} caption="Sent or accepted" />
        <Stat label="Profile views" value={totalViews} caption={verified ? "Across your listings" : hidden} />
      </div>

      {todo.length > 0 && (
        <section className="rounded-xl border border-sand-deep bg-paper p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg">Finish your profile</h3>
            <span className="text-sm text-ink-soft">{pct}% complete</span>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-sand-deep"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile completeness"
          >
            <div className="h-full rounded-full bg-forest" style={{ width: `${pct}%` }} />
          </div>
          <ul className="mt-4 divide-y divide-sand-deep">
            {todo.map((c) => (
              <li key={c.label} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>{c.label}</span>
                <Link href={c.href} className="rounded-lg border border-sand-deep px-4 py-2 font-medium text-forest transition-colors hover:border-forest">
                  Go
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
