import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  userCompanies,
  companyProducts,
  productImageCounts,
  reference,
} from "@/lib/supabase-server";
import ProductRowActions from "@/components/account/ProductRowActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your listings",
  robots: { index: false, follow: false },
};

const STATUS: Record<string, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-sand-deep text-ink-soft" },
  active: { label: "Published", tone: "bg-forest/10 text-forest" },
  archived: { label: "Archived", tone: "bg-[#f6e3e0] text-[#8c3b2c]" },
};

function money(
  minor: number | null,
  currency: string | null,
  minorUnits: number
) {
  if (minor === null || !currency) return null;
  return `${currency} ${(minor / 10 ** minorUnits).toLocaleString("en-GB", {
    minimumFractionDigits: minorUnits,
    maximumFractionDigits: minorUnits,
  })}`;
}

export default async function ProductsPage() {
  const companies = await userCompanies();
  const company = companies[0];
  if (!company) redirect("/account/company/new");

  const [products, ref] = await Promise.all([
    companyProducts(company.id),
    reference(),
  ]);
  const counts = await productImageCounts(products.map((p) => p.id));

  const categoryName = new Map(ref.categories.map((c) => [c.id, c.name]));
  const unitName = new Map(ref.units.map((u) => [u.code, u.name]));
  const minorOf = new Map(ref.currencies.map((c) => [c.code, c.minor_units]));

  const published = products.filter((p) => p.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl">Your listings</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {products.length === 0
              ? "Nothing listed yet"
              : `${products.length} listing${products.length === 1 ? "" : "s"}, ${published} published`}
          </p>
        </div>
        <Link
          href="/account/products/new"
          className="btn-lift rounded-lg bg-forest px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-gold hover:text-forest-deep"
        >
          Add a listing
        </Link>
      </div>

      {/* Nothing is visible to buyers until the company is verified, and a
          supplier who lists ten products and hears nothing deserves to know
          why before they conclude the site is broken. */}
      {company.verification_status !== "verified" && products.length > 0 && (
        <p className="rounded-xl border border-gold/40 bg-gold/8 px-5 py-4 leading-relaxed text-ink">
          <span className="font-semibold text-forest">Not visible yet.</span>{" "}
          Published listings appear in the catalogue once your company is
          verified.{" "}
          <Link href="/account/documents" className="link-quiet text-forest">
            Finish verification
          </Link>
        </p>
      )}

      {products.length === 0 ? (
        <div className="rounded-xl border border-sand-deep bg-paper p-8 shadow-sm">
          <h3 className="text-xl">List what you can supply</h3>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
            A listing is one product with its specification, quantities,
            season and terms. Buyers search and filter across these, so a
            precise listing with real numbers gets found and a vague one
            does not.
          </p>
          <Link
            href="/account/products/new"
            className="btn-lift btn-primary mt-7 inline-block"
          >
            Add your first listing
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {products.map((p) => {
            const state = STATUS[p.status] ?? STATUS.draft;
            const minorUnits = minorOf.get(p.price_currency ?? "") ?? 2;
            const from = money(p.price_min_minor, p.price_currency, minorUnits);
            const to = money(p.price_max_minor, p.price_currency, minorUnits);
            const images = counts[p.id] ?? 0;

            return (
              <li
                key={p.id}
                className="rounded-xl border border-sand-deep bg-paper p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/account/products/${p.id}`}
                      className="text-lg font-medium text-ink hover:text-forest"
                    >
                      {p.name}
                    </Link>
                    <p className="mt-1 text-sm text-stone">
                      {[
                        categoryName.get(p.category_id),
                        unitName.get(p.unit_code),
                        images === 0
                          ? "No photographs"
                          : `${images} photograph${images === 1 ? "" : "s"}`,
                      ]
                        .filter(Boolean)
                        .join(" . ")}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${state.tone}`}
                  >
                    {state.label}
                  </span>
                </div>

                {p.summary && (
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
                    {p.summary}
                  </p>
                )}

                <p className="mt-3 text-sm text-ink-soft">
                  {!p.price_is_public
                    ? "Price on enquiry"
                    : from
                      ? to && to !== from
                        ? `${from} to ${to}`
                        : from
                      : "No price set"}
                </p>

                {images === 0 && (
                  <p className="mt-3 text-sm text-[#8c3b2c]">
                    No photographs. A listing without one is passed over.
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-sand pt-4">
                  <Link
                    href={`/account/products/${p.id}`}
                    className="rounded-lg border border-sand-deep px-3.5 py-1.5 text-sm text-forest transition-colors hover:border-forest"
                  >
                    Edit
                  </Link>
                  <ProductRowActions
                    companyId={company.id}
                    productId={p.id}
                    status={p.status}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
