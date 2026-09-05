import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin, sessionClient } from "@/lib/supabase-server";
import { CATEGORIES } from "@/lib/content";
import SignOutButton from "./SignOutButton";

export const dynamic = "force-dynamic";

type Lead = {
  id: string;
  lead_type: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  country_code: string | null;
  categories_of_interest: string[] | null;
  message: string | null;
  contacted_at: string | null;
  created_at: string;
};

const NAMES = new Map(CATEGORIES.map((c) => [c.slug, c.name]));

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { type, q } = await searchParams;
  const supabase = await sessionClient();

  let query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (type === "buyer" || type === "supplier") query = query.eq("lead_type", type);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,company_name.ilike.%${q}%`);

  const { data, error } = await query;
  const leads = (data ?? []) as Lead[];

  const buyers = leads.filter((l) => l.lead_type === "buyer").length;
  const suppliers = leads.filter((l) => l.lead_type === "supplier").length;

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl">Leads</h1>
          <p className="mt-2 text-sm text-stone">
            Signed in as {admin.email}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a href={`/admin/leads/export${type ? `?type=${type}` : ""}`} className="btn-ghost !py-2 !px-4 text-sm">
            Export CSV
          </a>
          <SignOutButton />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-sand-deep py-4 text-sm">
        <span className="tabular">
          <strong className="text-forest">{leads.length}</strong> shown
        </span>
        <span className="tabular text-stone">
          {buyers} buyers, {suppliers} suppliers
        </span>

        <nav className="ml-auto flex gap-4" aria-label="Filter by type">
          {[
            ["All", undefined],
            ["Buyers", "buyer"],
            ["Suppliers", "supplier"],
          ].map(([label, value]) => (
            <Link
              key={label as string}
              href={value ? `/admin?type=${value}` : "/admin"}
              className={
                type === value || (!type && !value)
                  ? "font-medium text-forest underline"
                  : "link-quiet text-ink-soft"
              }
            >
              {label as string}
            </Link>
          ))}
        </nav>
      </div>

      <form className="mt-5 flex gap-3" action="/admin">
        {type && <input type="hidden" name="type" value={type} />}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, email or company"
          className="w-full max-w-sm border border-sand-deep bg-paper px-3 py-2 text-sm text-ink"
        />
        <button type="submit" className="btn-primary !py-2 !px-4 text-sm">
          Search
        </button>
      </form>

      {error && (
        <p className="mt-6 border-l-2 border-gold bg-sand px-4 py-3 text-sm">
          Could not load leads: {error.message}
        </p>
      )}

      {leads.length === 0 ? (
        <p className="mt-10 text-ink-soft">
          Nothing here yet. Submissions from the contact page appear as they come in.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead>
              <tr className="border-b border-sand-deep text-stone">
                <th scope="col" className="py-2.5 pr-4 font-medium">Received</th>
                <th scope="col" className="py-2.5 pr-4 font-medium">Type</th>
                <th scope="col" className="py-2.5 pr-4 font-medium">Name</th>
                <th scope="col" className="py-2.5 pr-4 font-medium">Company</th>
                <th scope="col" className="py-2.5 pr-4 font-medium">Contact</th>
                <th scope="col" className="py-2.5 font-medium">Interested in</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-sand align-top">
                  <td className="tabular py-3 pr-4 whitespace-nowrap text-stone">
                    {new Date(lead.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={
                        lead.lead_type === "supplier"
                          ? "rounded bg-gold px-2 py-0.5 text-xs text-forest-deep"
                          : "rounded bg-forest px-2 py-0.5 text-xs text-paper"
                      }
                    >
                      {lead.lead_type}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-ink">
                    {lead.full_name}
                    {lead.country_code && (
                      <span className="block text-xs text-stone">{lead.country_code}</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-ink-soft">{lead.company_name ?? "-"}</td>
                  <td className="py-3 pr-4">
                    <a href={`mailto:${lead.email}`} className="link-quiet text-ink-soft">
                      {lead.email}
                    </a>
                    {lead.phone && (
                      <span className="block text-xs text-stone">{lead.phone}</span>
                    )}
                  </td>
                  <td className="py-3 text-ink-soft">
                    {(lead.categories_of_interest ?? [])
                      .map((s) => NAMES.get(s) ?? s)
                      .join(", ") || "-"}
                    {lead.message && (
                      <span className="mt-1 block max-w-md text-xs text-stone">
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

      <p className="mt-8 text-xs text-stone">
        Showing the 200 most recent. Export the CSV for the full list.
      </p>
    </section>
  );
}
