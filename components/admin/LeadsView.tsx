import Link from "next/link";
import { sessionClient } from "@/lib/supabase-server";
import { CATEGORIES } from "@/lib/content";
import { Panel } from "@/components/admin/Shell";

export type Lead = {
  id: string;
  lead_type: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  country_code: string | null;
  categories_of_interest: string[] | null;
  message: string | null;
  created_at: string;
};

const NAMES = new Map(CATEGORIES.map((c) => [c.slug, c.name]));

/**
 * The lead table, shared by All leads, Buyers, Suppliers and Subscribers.
 *
 * Each of those pages is the same query with the type fixed, so the table
 * lives here once. `basePath` keeps the search form and the CSV export
 * pointing back at whichever page is being viewed.
 */
export default async function LeadsView({
  leadType,
  basePath,
  q,
  emptyMessage,
}: {
  leadType?: "buyer" | "supplier" | "other";
  basePath: string;
  q?: string;
  emptyMessage: string;
}) {
  const supabase = await sessionClient();

  let query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (leadType) query = query.eq("lead_type", leadType);
  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,email.ilike.%${q}%,company_name.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  const leads = (data ?? []) as Lead[];

  return (
    <Panel
      title={`${leads.length} shown`}
      action={
        <a
          href={`/admin/leads/export${leadType ? `?type=${leadType}` : ""}`}
          className="rounded bg-gold px-4 py-2 text-sm font-medium text-[#042115] transition-opacity hover:opacity-85"
        >
          Export CSV
        </a>
      }
    >
      <div className="flex flex-wrap items-center gap-4">
        <nav className="flex flex-wrap gap-1" aria-label="Lead lists">
          {[
            ["All", "/admin/leads"],
            ["Buyers", "/admin/buyers"],
            ["Suppliers", "/admin/suppliers"],
            ["Subscribers", "/admin/subscribers"],
          ].map(([label, href]) => {
            const active = href === basePath;
            return (
              <Link
                key={label}
                href={href}
                className={
                  active
                    ? "rounded bg-gold px-3.5 py-2 text-sm font-medium text-[#042115]"
                    : "rounded px-3.5 py-2 text-sm text-white/60 transition-colors hover:bg-white/6 hover:text-white"
                }
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <form className="ml-auto flex gap-2" action={basePath}>
          <label htmlFor="q" className="sr-only">
            Search
          </label>
          <input
            id="q"
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, email or company"
            className="w-64 rounded bg-white/[0.06] px-3.5 py-2 text-sm text-white ring-1 ring-white/10 placeholder:text-white/35"
          />
          <button
            type="submit"
            className="rounded bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/16"
          >
            Search
          </button>
        </form>
      </div>

      {error && (
        <p className="mt-5 rounded border-l-2 border-gold bg-white/[0.04] px-4 py-3 text-sm text-white/80">
          Could not load leads: {error.message}
        </p>
      )}

      {leads.length === 0 ? (
        <p className="py-12 text-center text-white/45">{emptyMessage}</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[58rem] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[0.7rem] tracking-widest text-white/40 uppercase">
                <th scope="col" className="py-3 pr-4 font-semibold">Received</th>
                <th scope="col" className="py-3 pr-4 font-semibold">Type</th>
                <th scope="col" className="py-3 pr-4 font-semibold">Name</th>
                <th scope="col" className="py-3 pr-4 font-semibold">Company</th>
                <th scope="col" className="py-3 pr-4 font-semibold">Contact</th>
                <th scope="col" className="py-3 font-semibold">Interested in</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-white/6 align-top transition-colors hover:bg-white/[0.03]"
                >
                  <td className="tabular py-3.5 pr-4 whitespace-nowrap text-white/45">
                    {new Date(lead.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-3.5 pr-4">
                    <span
                      className={
                        lead.lead_type === "supplier"
                          ? "rounded bg-gold/20 px-2.5 py-1 text-xs text-gold"
                          : lead.lead_type === "buyer"
                            ? "rounded bg-[#2FA36B]/20 px-2.5 py-1 text-xs text-[#4CC98D]"
                            : "rounded bg-[#3B82F6]/20 px-2.5 py-1 text-xs text-[#7CADFA]"
                      }
                    >
                      {lead.lead_type}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 text-white">
                    {lead.full_name}
                    {lead.country_code && (
                      <span className="block text-xs text-white/40">
                        {lead.country_code}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 pr-4 text-white/70">
                    {lead.company_name ?? "-"}
                  </td>
                  <td className="py-3.5 pr-4">
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-white/70 hover:text-gold"
                    >
                      {lead.email}
                    </a>
                    {lead.phone && (
                      <span className="block text-xs text-white/40">{lead.phone}</span>
                    )}
                  </td>
                  <td className="py-3.5 text-white/70">
                    {(lead.categories_of_interest ?? [])
                      .map((s) => NAMES.get(s) ?? s)
                      .join(", ") || "-"}
                    {lead.message && (
                      <span className="mt-1 block max-w-sm text-xs text-white/40">
                        {lead.message}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-5 text-xs text-white/35">
        Showing the 500 most recent. Export the CSV for the full list.
      </p>
    </Panel>
  );
}
