import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  userCompanies,
  companyProducts,
  productImageCounts,
  productFirstImages,
  reference,
  sessionClient,
} from "@/lib/supabase-server";
import { COUNTRIES } from "@/lib/countries";
import { season } from "@/components/catalogue/ListingCard";
import ProductRowActions from "@/components/account/ProductRowActions";
import ListingFilters from "@/components/account/ListingFilters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your listings",
  robots: { index: false, follow: false },
};

/**
 * A listing's state as the supplier experiences it.
 *
 * The products table stores three statuses: draft, active, archived. The
 * supplier sees four, because an active listing on a company that is not
 * verified yet is not live and saying "Published" about it would be a lie.
 * That case is its own tab, and it resolves itself the moment the company
 * is verified.
 */
type Tab = "active" | "pending" | "drafts" | "closed";

const TABS: { id: Tab; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "pending", label: "Pending review" },
  { id: "drafts", label: "Drafts" },
  { id: "closed", label: "Closed" },
];

const PILL: Record<Tab, { label: string; tone: string }> = {
  active: { label: "Active", tone: "bg-forest/10 text-forest" },
  pending: { label: "Pending review", tone: "bg-gold/15 text-gold-deep" },
  drafts: { label: "Draft", tone: "bg-sand-deep text-ink-soft" },
  closed: { label: "Closed", tone: "bg-[#f6e3e0] text-[#8c3b2c]" },
};

function tabOf(status: string, verified: boolean): Tab {
  if (status === "archived") return "closed";
  if (status === "draft") return "drafts";
  return verified ? "active" : "pending";
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-sand px-2.5 py-1 text-xs text-ink-soft">
      {children}
    </span>
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; cat?: string; origin?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const tab: Tab = (TABS.find((t) => t.id === sp.tab)?.id ?? "active") as Tab;

  const companies = await userCompanies();
  const company = companies[0];
  if (!company) redirect("/account/company/new");

  const verified = company.verification_status === "verified";

  const [products, ref] = await Promise.all([companyProducts(company.id), reference()]);
  const ids = products.map((p) => p.id);
  const [imageCounts, thumbs, quotes] = await Promise.all([
    productImageCounts(ids),
    productFirstImages(ids),
    quoteCounts(ids),
  ]);

  const categoryName = new Map(ref.categories.map((c) => [c.id, c.name]));
  const unitName = new Map(ref.units.map((u) => [u.code, u.name]));
  const countryName = new Map(COUNTRIES.map((c) => [c.code, c.name]));

  // Counts are over everything, so the tabs do not change as you filter.
  const counts: Record<Tab, number> = { active: 0, pending: 0, drafts: 0, closed: 0 };
  for (const p of products) counts[tabOf(p.status, verified)] += 1;

  const needle = (sp.q ?? "").trim().toLowerCase();
  const shown = products.filter((p) => {
    if (tabOf(p.status, verified) !== tab) return false;
    if (sp.cat && p.category_id !== sp.cat) return false;
    if (sp.origin && p.origin_country_code !== sp.origin) return false;
    if (needle && !`${p.name} ${p.summary ?? ""}`.toLowerCase().includes(needle)) {
      return false;
    }
    return true;
  });

  // Only the origins actually used, so the filter never offers a country
  // that would return nothing.
  const usedOrigins = [...new Set(products.map((p) => p.origin_country_code).filter(Boolean))]
    .map((code) => ({ code: code as string, name: countryName.get(code as string) ?? (code as string) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const usedCategories = [...new Set(products.map((p) => p.category_id))]
    .map((id) => ({ id, name: categoryName.get(id) ?? "Uncategorised" }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const qs = (next: Tab) => {
    const p = new URLSearchParams();
    if (next !== "active") p.set("tab", next);
    if (sp.cat) p.set("cat", sp.cat);
    if (sp.origin) p.set("origin", sp.origin);
    if (sp.q) p.set("q", sp.q);
    const s = p.toString();
    return s ? `/account/products?${s}` : "/account/products";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl">Your listings</h2>
          <p className="mt-1 text-sm text-ink-soft">
            One listing is one product with its specification, quantities,
            season and terms.
          </p>
        </div>
        <Link
          href="/account/products/new"
          className="btn-lift shrink-0 rounded-lg bg-forest px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-gold hover:text-forest-deep"
        >
          Add a listing
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-sand-deep bg-paper p-8 shadow-sm">
          <h3 className="text-xl">List what you can supply</h3>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
            A listing is one product with its specification, quantities,
            season and terms. Buyers search and filter across these, so a
            precise listing with real numbers gets found and a vague one
            does not.
          </p>
          <Link href="/account/products/new" className="btn-lift btn-primary mt-7 inline-block">
            Add your first listing
          </Link>
        </div>
      ) : (
        <>
          {/* ---------- Tabs ---------- */}
          <nav className="flex gap-1 overflow-x-auto border-b border-sand-deep">
            {TABS.map((t) => {
              const on = t.id === tab;
              return (
                <Link
                  key={t.id}
                  href={qs(t.id)}
                  aria-current={on ? "page" : undefined}
                  className={
                    "-mb-px border-b-2 px-4 py-3 text-sm whitespace-nowrap transition-colors " +
                    (on
                      ? "border-forest font-semibold text-forest"
                      : "border-transparent text-ink-soft hover:text-forest")
                  }
                >
                  {t.label}{" "}
                  <span className={on ? "text-forest" : "text-stone"}>{counts[t.id]}</span>
                </Link>
              );
            })}
          </nav>

          <ListingFilters categories={usedCategories} origins={usedOrigins} />

          {/* Nothing is visible to buyers until the company is verified, and
              a supplier who lists ten products and hears nothing deserves to
              know why before they conclude the site is broken. */}
          {!verified && counts.pending > 0 && (
            <p className="rounded-xl border border-gold/40 bg-gold/8 px-5 py-4 leading-relaxed text-ink">
              <span className="font-semibold text-forest">Not public yet.</span>{" "}
              Your listings appear in the catalogue once your company is
              verified. Nothing is wrong with them.{" "}
              <Link href="/account/documents" className="link-quiet text-forest">
                Finish verification
              </Link>
            </p>
          )}

          {shown.length === 0 ? (
            <p className="rounded-xl border border-sand-deep bg-paper px-6 py-10 text-center text-ink-soft shadow-sm">
              {counts[tab] === 0
                ? `Nothing in ${TABS.find((t) => t.id === tab)?.label.toLowerCase()}.`
                : "No listing here matches that filter."}
            </p>
          ) : (
            <ul className="space-y-4">
              {shown.map((p) => {
                const state = PILL[tabOf(p.status, verified)];
                const images = imageCounts[p.id] ?? 0;
                const thumb = thumbs[p.id];
                const peak = season(p.harvest_months ?? null);

                const meta = [
                  countryName.get(p.origin_country_code ?? "") ?? null,
                  unitName.get(p.unit_code) ?? null,
                  tabOf(p.status, verified) === "pending"
                    ? "Awaiting review"
                    : peak
                      ? `Peak ${peak}`
                      : null,
                ].filter(Boolean);

                return (
                  <li
                    key={p.id}
                    className="rounded-xl border border-sand-deep bg-paper p-5 shadow-sm sm:p-6"
                  >
                    <div className="flex flex-wrap items-start gap-5">
                      {/* ---------- Photograph ---------- */}
                      <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-sand">
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt=""
                            fill
                            sizes="128px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center text-xs text-stone">
                            No photo
                          </span>
                        )}
                      </div>

                      {/* ---------- Name, meta, numbers ---------- */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <Link
                            href={`/account/products/${p.id}`}
                            className="text-lg font-medium text-ink hover:text-forest"
                          >
                            {p.name}
                          </Link>
                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${state.tone}`}
                          >
                            {state.label}
                          </span>
                        </div>

                        {meta.length > 0 && (
                          <p className="mt-1 text-sm text-stone">{meta.join(" · ")}</p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Chip>{p.view_count} views</Chip>
                          <Chip>
                            {p.enquiry_count} {p.enquiry_count === 1 ? "enquiry" : "enquiries"}
                          </Chip>
                          <Chip>
                            {quotes[p.id] ?? 0} {(quotes[p.id] ?? 0) === 1 ? "quote" : "quotes"} sent
                          </Chip>
                          {images === 0 && <Chip>No photographs</Chip>}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-sand pt-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/account/products/${p.id}`}
                          className="rounded-lg border border-sand-deep px-4 py-2 text-sm font-medium text-forest transition-colors hover:border-forest"
                        >
                          Edit
                        </Link>
                        <ProductRowActions
                          companyId={company.id}
                          productId={p.id}
                          status={p.status}
                        />
                      </div>

                      {/* Promoting is board 11 and Stage 3 work. The button is
                          here because the screen was signed off with it, but it
                          is inert rather than pointing at a page that does not
                          exist. */}
                      <button
                        type="button"
                        disabled
                        title="Promoting arrives in Stage 3"
                        className="cursor-not-allowed rounded-lg bg-gold/40 px-5 py-2 text-sm font-semibold text-forest-deep/60"
                      >
                        Feature this listing
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gold/40 bg-gold/8 px-6 py-5">
            <div className="min-w-0">
              <p className="font-semibold text-forest">
                Feature a listing for more buyer reach
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink">
                Featured listings sit at the top of category and seasonal
                results. Arriving in Stage 3.
              </p>
            </div>
            <button
              type="button"
              disabled
              className="shrink-0 cursor-not-allowed rounded-lg bg-gold/40 px-5 py-2.5 text-sm font-semibold text-forest-deep/60"
            >
              See options
            </button>
          </section>
        </>
      )}
    </div>
  );
}

/** How many quotations each listing has been included in, in one query. */
async function quoteCounts(productIds: string[]): Promise<Record<string, number>> {
  if (productIds.length === 0) return {};
  const supabase = await sessionClient();

  const { data } = await supabase
    .from("quotation_lines")
    .select("product_id, quotation_id")
    .in("product_id", productIds);

  // A quotation can carry the same product on more than one line, so the
  // count is of distinct quotations rather than of lines.
  const seen = new Map<string, Set<string>>();
  for (const row of (data ?? []) as { product_id: string; quotation_id: string }[]) {
    if (!seen.has(row.product_id)) seen.set(row.product_id, new Set());
    seen.get(row.product_id)!.add(row.quotation_id);
  }

  const out: Record<string, number> = {};
  for (const [pid, set] of seen) out[pid] = set.size;
  return out;
}
