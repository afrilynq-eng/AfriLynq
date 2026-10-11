import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import AdminShell, { Panel, StatCard } from "@/components/admin/Shell";
import ProductAdminActions from "@/components/admin/ProductAdminActions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  active: "Published",
  archived: "Archived",
};

const STATUS_COLOUR: Record<string, string> = {
  draft: "text-white/45",
  active: "text-[#4BC98C]",
  archived: "text-[#E08A84]",
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

interface Row {
  id: string;
  name: string;
  slug: string;
  status: string;
  is_featured: boolean;
  view_count: number;
  enquiry_count: number;
  unit_code: string;
  price_currency: string | null;
  price_min_minor: number | null;
  price_is_public: boolean;
  created_at: string;
  company_id: string;
  category_id: string;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { q, status } = await searchParams;

  // Authorisation is requireAdmin above. This reads every listing on the
  // platform, published or not, which is the job of the page.
  const svc = serviceClient();

  let query = svc
    .from("products")
    .select(
      "id, name, slug, status, is_featured, view_count, enquiry_count, unit_code, price_currency, price_min_minor, price_is_public, created_at, company_id, category_id"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (status && STATUS_LABEL[status]) query = query.eq("status", status);
  if (q?.trim()) {
    const needle = q.trim().replace(/[%,]/g, " ");
    query = query.or(`name.ilike.%${needle}%,summary.ilike.%${needle}%`);
  }

  const { data } = await query;
  const products = (data ?? []) as Row[];

  const [{ data: companies }, { data: categories }] = await Promise.all([
    svc.from("companies").select("id, legal_name, trading_name, verification_status"),
    svc.from("categories").select("id, name"),
  ]);

  const companyById = new Map(
    ((companies ?? []) as {
      id: string;
      legal_name: string;
      trading_name: string | null;
      verification_status: string;
    }[]).map((c) => [c.id, c])
  );
  const categoryById = new Map(
    ((categories ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name])
  );

  /**
   * Published by a company nobody has verified.
   *
   * Not a leak: products_public_read hides these from buyers. It is worth
   * counting because it tells you who is ready and waiting on you, which
   * is a better prompt than the verification queue alone.
   */
  const liveButUnverified = products.filter(
    (p) =>
      p.status === "active" &&
      companyById.get(p.company_id)?.verification_status !== "verified"
  ).length;

  const published = products.filter((p) => p.status === "active").length;
  const featured = products.filter((p) => p.is_featured).length;

  return (
    <AdminShell
      admin={admin}
      title="Listings"
      subtitle="Every product listed on the platform, published or not"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={products.length} label="Listings" accent="gold" />
        <StatCard value={published} label="Published" accent="green" />
        <StatCard value={featured} label="Featured" accent="blue" />
        <StatCard
          value={liveButUnverified}
          label="Live but unverified"
          accent={liveButUnverified > 0 ? "red" : "slate"}
          caption={
            liveButUnverified > 0
              ? "Hidden from buyers until the company is verified"
              : undefined
          }
        />
      </div>

      <div className="mt-6">
        <Panel title="All listings">
          <div className="flex flex-wrap items-center gap-4">
            <nav className="flex flex-wrap gap-1" aria-label="Filter by status">
              {FILTERS.map((f) => {
                const active = (status ?? "") === f.value;
                const href = f.value
                  ? `/admin/products?status=${f.value}`
                  : "/admin/products";
                return (
                  <Link
                    key={f.label}
                    href={href}
                    className={
                      "rounded px-3.5 py-2 text-sm transition-colors " +
                      (active
                        ? "bg-white/14 text-white"
                        : "text-white/55 hover:bg-white/6 hover:text-white")
                    }
                  >
                    {f.label}
                  </Link>
                );
              })}
            </nav>

            <form className="ml-auto flex gap-2" action="/admin/products">
              {status && <input type="hidden" name="status" value={status} />}
              <label htmlFor="q" className="sr-only">
                Search listings
              </label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={q ?? ""}
                placeholder="Search by name"
                className="w-56 rounded bg-white/[0.06] px-3.5 py-2 text-sm text-white ring-1 ring-white/10 placeholder:text-white/35"
              />
              <button
                type="submit"
                className="rounded bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/16"
              >
                Search
              </button>
            </form>
          </div>

          {products.length === 0 ? (
            <p className="py-12 text-center text-white/45">
              Nothing here. Listings appear as suppliers add them.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[56rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[0.7rem] tracking-widest text-white/40 uppercase">
                    <th scope="col" className="py-3 pr-4 font-semibold">Listing</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Supplier</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Category</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Status</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Interest</th>
                    <th scope="col" className="py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const company = companyById.get(p.company_id);
                    const verified = company?.verification_status === "verified";

                    return (
                      <tr
                        key={p.id}
                        className="border-b border-white/6 align-top transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="py-3.5 pr-4 text-white">
                          {p.status === "active" && verified ? (
                            <Link
                              href={`/marketplace/${p.slug}`}
                              target="_blank"
                              className="hover:text-gold"
                            >
                              {p.name}
                            </Link>
                          ) : (
                            p.name
                          )}
                          {p.is_featured && (
                            <span className="ml-2 rounded bg-gold/15 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-gold uppercase">
                              Featured
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 pr-4">
                          <Link
                            href={`/admin/companies/${p.company_id}`}
                            className="text-white/70 hover:text-gold"
                          >
                            {company
                              ? company.trading_name || company.legal_name
                              : "Unknown"}
                          </Link>
                          {!verified && (
                            <span className="block text-xs text-[#E08A84]">
                              Not verified
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 pr-4 text-white/70">
                          {categoryById.get(p.category_id) ?? "None"}
                        </td>

                        <td className="py-3.5 pr-4">
                          <span className={STATUS_COLOUR[p.status] ?? "text-white/45"}>
                            {STATUS_LABEL[p.status] ?? p.status}
                          </span>
                        </td>

                        <td className="tabular py-3.5 pr-4 text-white/70">
                          {p.view_count} view{p.view_count === 1 ? "" : "s"}
                          <span className="block text-xs text-white/40">
                            {p.enquiry_count} enquir
                            {p.enquiry_count === 1 ? "y" : "ies"}
                          </span>
                        </td>

                        <td className="py-3.5">
                          <ProductAdminActions
                            productId={p.id}
                            status={p.status}
                            featured={p.is_featured}
                          />
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
