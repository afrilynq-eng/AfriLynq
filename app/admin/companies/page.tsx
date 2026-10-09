import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import { COUNTRIES } from "@/lib/countries";
import AdminShell, { Panel, StatCard } from "@/components/admin/Shell";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  supplier: "Supplier",
  buyer: "Buyer",
  both: "Both",
};

const STATUS_COLOUR: Record<string, string> = {
  unverified: "text-white/45",
  pending: "text-gold",
  verified: "text-[#4BC98C]",
  rejected: "text-[#E08A84]",
  suspended: "text-[#E08A84]",
};

const STATUS_LABEL: Record<string, string> = {
  unverified: "Not submitted",
  pending: "Awaiting review",
  verified: "Verified",
  rejected: "Rejected",
  suspended: "Suspended",
};

const COUNTRY = new Map(COUNTRIES.map((c) => [c.code, c.name]));

interface Row {
  id: string;
  legal_name: string;
  trading_name: string | null;
  company_type: string;
  country_code: string | null;
  city: string | null;
  verification_status: string;
  is_listed: boolean;
  created_at: string;
}

export default async function AdminCompaniesPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  // Authorisation is the requireAdmin above. This reads across every
  // company, which is the point of the page.
  const svc = serviceClient();

  const { data } = await svc
    .from("companies")
    .select(
      "id, legal_name, trading_name, company_type, country_code, city, verification_status, is_listed, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const companies = (data ?? []) as Row[];

  const { data: memberRows } = await svc
    .from("company_members")
    .select("company_id, user_id")
    .eq("member_role", "owner");

  const ownerIds = new Map(
    ((memberRows ?? []) as { company_id: string; user_id: string }[]).map((r) => [
      r.company_id,
      r.user_id,
    ])
  );

  const { data: people } = await svc.from("profiles").select("id, full_name, email");
  const byId = new Map(
    ((people ?? []) as { id: string; full_name: string | null; email: string | null }[]).map(
      (p) => [p.id, p]
    )
  );

  const pending = companies.filter((c) => c.verification_status === "pending").length;
  const verified = companies.filter((c) => c.verification_status === "verified").length;
  const listed = companies.filter((c) => c.is_listed).length;

  return (
    <AdminShell
      admin={admin}
      title="Companies"
      subtitle="Every company created through the site, whatever stage it has reached"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={companies.length} label="Companies" accent="gold" />
        <StatCard
          value={pending}
          label="Awaiting review"
          accent={pending > 0 ? "red" : "slate"}
          caption={pending > 0 ? "Needs a decision" : "Nothing waiting"}
        />
        <StatCard value={verified} label="Verified" accent="green" />
        <StatCard value={listed} label="Listed publicly" accent="blue" />
      </div>

      <div className="mt-6">
        <Panel
          title="All companies"
          action={
            pending > 0 ? (
              <Link
                href="/admin/verification"
                className="rounded bg-gold px-4 py-2 text-sm font-medium text-[#042115] transition-opacity hover:opacity-85"
              >
                Review {pending} waiting
              </Link>
            ) : undefined
          }
        >
          {companies.length === 0 ? (
            <p className="py-12 text-center text-white/45">
              No companies yet. One appears here as soon as somebody creates it
              from their account.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[0.7rem] tracking-widest text-white/40 uppercase">
                    <th scope="col" className="py-3 pr-4 font-semibold">Created</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Company</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Owner</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Type</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Where</th>
                    <th scope="col" className="py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => {
                    const owner = byId.get(ownerIds.get(c.id) ?? "");
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-white/6 align-top transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="tabular py-3.5 pr-4 whitespace-nowrap text-white/45">
                          {new Date(c.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3.5 pr-4 text-white">
                          {c.trading_name || c.legal_name}
                          {c.trading_name && (
                            <span className="block text-xs text-white/40">
                              {c.legal_name}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 pr-4 text-white/70">
                          {owner?.full_name ?? "Unknown"}
                          {owner?.email && (
                            <span className="block text-xs text-white/40">
                              {owner.email}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 pr-4 text-white/70">
                          {TYPE_LABEL[c.company_type] ?? c.company_type}
                        </td>
                        <td className="py-3.5 pr-4 text-white/70">
                          {[c.city, c.country_code ? (COUNTRY.get(c.country_code) ?? c.country_code) : null]
                            .filter(Boolean)
                            .join(", ") || "Not set"}
                        </td>
                        <td className="py-3.5">
                          <span className={STATUS_COLOUR[c.verification_status] ?? "text-white/45"}>
                            {STATUS_LABEL[c.verification_status] ?? c.verification_status}
                          </span>
                          {c.is_listed && (
                            <span className="block text-xs text-white/35">
                              In the directory
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}
