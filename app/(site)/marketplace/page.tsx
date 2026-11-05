import type { Metadata } from "next";
import Link from "next/link";
import { publicListings, catalogueLabels } from "@/lib/catalogue";
import { COUNTRIES } from "@/lib/countries";
import ListingCard from "@/components/catalogue/ListingCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Produce listed by verified African suppliers, with quantities, harvest windows and shipping terms against each listing.",
  alternates: { canonical: "/marketplace" },
};

/**
 * The catalogue.
 *
 * Filtering is done with plain links and a form rather than client side
 * state, so the page stays server rendered and every filtered view has a
 * URL that can be shared, bookmarked and indexed. It is also the only way
 * an empty marketplace degrades gracefully: there is no spinner resolving
 * into nothing.
 */
export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; country?: string }>;
}) {
  const { q, category, country } = await searchParams;

  /**
   * A database problem must not white-screen the marketplace.
   *
   * Both of these throw if Supabase cannot be reached, and an uncaught
   * throw in a server component renders "Application error: a
   * server-side exception has occurred", which tells a visitor nothing
   * and tells them it in the ugliest way available.
   *
   * Caught, the page still renders its header, its search and an honest
   * message. The distinction below between "could not load" and "nothing
   * listed yet" matters: telling somebody the marketplace is empty when
   * in fact it is unreachable is the silent failure this codebase has
   * been full of, just with nicer wording.
   */
  let listings: Awaited<ReturnType<typeof publicListings>> = [];
  let labels: Awaited<ReturnType<typeof catalogueLabels>> = {
    categories: [],
    units: [],
  };
  let unavailable = false;

  try {
    [listings, labels] = await Promise.all([
      publicListings({ q, category, country }),
      catalogueLabels(),
    ]);
  } catch (err) {
    unavailable = true;
    console.error("[marketplace] could not load listings:", err);
  }

  const categoryName = new Map(labels.categories.map((c) => [c.id, c.name]));
  const unitName = new Map(labels.units.map((u) => [u.code, u.name.toLowerCase()]));
  const countryName = new Map(COUNTRIES.map((c) => [c.code, c.name]));

  // Only offer countries that actually have something in them. A filter
  // that returns nothing for 240 of its 250 options is a worse experience
  // than a short list.
  const availableCountries = [
    ...new Set(listings.map((l) => l.originCountryCode).filter(Boolean)),
  ] as string[];

  const filtered = Boolean(q || category || country);

  return (
    <>
      <section className="border-b border-sand-deep bg-sand">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h1 className="text-4xl sm:text-5xl">Marketplace</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Produce listed by suppliers we have verified. Every company here
            has had its registration and certificates checked before anything
            of theirs appeared on this page.
          </p>

          {/* The mirror of the panel on /products. Two grids of produce with
              a search box on each, and until now nothing on either page
              said which was which. */}
          <div className="mt-6 max-w-2xl rounded-lg border border-sand-deep bg-paper/80 p-5">
            <p className="leading-relaxed text-ink-soft">
              <strong className="font-semibold text-ink">
                This is what suppliers are offering right now.
              </strong>{" "}
              Every listing here is live, with a quantity, a season and a
              named company behind it. For the full list of what AfriLynq
              can source, offered or not, see{" "}
              <Link href="/products" className="link-quiet text-forest">
                what we source
              </Link>
              .
            </p>
          </div>

          <form className="mt-8 flex flex-wrap gap-3" action="/marketplace">
            <label htmlFor="q" className="sr-only">
              Search listings
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q ?? ""}
              placeholder="Sesame, cashew, shea butter"
              className="min-w-[14rem] flex-1 rounded-lg border border-sand-deep bg-paper px-4 py-3 text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30"
            />

            <select
              name="category"
              defaultValue={category ?? ""}
              aria-label="Category"
              className="rounded-lg border border-sand-deep bg-paper px-4 py-3 text-ink outline-none focus:border-gold"
            >
              <option value="">All categories</option>
              {labels.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {availableCountries.length > 1 && (
              <select
                name="country"
                defaultValue={country ?? ""}
                aria-label="Country of origin"
                className="rounded-lg border border-sand-deep bg-paper px-4 py-3 text-ink outline-none focus:border-gold"
              >
                <option value="">All origins</option>
                {availableCountries.map((code) => (
                  <option key={code} value={code}>
                    {countryName.get(code) ?? code}
                  </option>
                ))}
              </select>
            )}

            <button type="submit" className="btn-lift btn-primary">
              Search
            </button>

            {filtered && (
              <Link href="/marketplace" className="btn-lift btn-ghost">
                Clear
              </Link>
            )}
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        {unavailable ? (
          <div className="rounded-xl border border-sand-deep bg-paper p-10 text-center">
            <h2 className="text-2xl">We cannot reach the listings right now</h2>
            <p className="mx-auto mt-4 max-w-xl leading-relaxed text-ink-soft">
              This is a problem at our end, not yours, and it is being
              logged. Try again in a few minutes. If you need something
              urgently, tell us what you are looking for and we will come
              back to you directly.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/marketplace" className="btn-lift btn-primary">
                Try again
              </Link>
              <Link href="/contact" className="btn-lift btn-ghost">
                Contact us
              </Link>
            </div>
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-xl border border-sand-deep bg-paper p-10 text-center">
            <h2 className="text-2xl">
              {filtered ? "Nothing matches that" : "No listings yet"}
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-relaxed text-ink-soft">
              {filtered
                ? "Try a broader search, or clear the filters to see everything currently listed."
                : "Suppliers are being verified now. Listings appear here as each company is approved, and nothing reaches this page before that."}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {filtered ? (
                <Link href="/marketplace" className="btn-lift btn-primary">
                  See everything
                </Link>
              ) : (
                <>
                  <Link href="/register/farmer" className="btn-lift btn-primary">
                    List your produce
                  </Link>
                  <Link href="/register/retailer" className="btn-lift btn-ghost">
                    Register as a buyer
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-ink-soft">
              {listings.length} listing{listings.length === 1 ? "" : "s"}
              {filtered ? " matching" : " from verified suppliers"}
            </p>

            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  categoryName={categoryName.get(listing.categoryId) ?? null}
                  unitName={unitName.get(listing.unitCode) ?? listing.unitCode}
                  countryName={
                    listing.originCountryCode
                      ? (countryName.get(listing.originCountryCode) ?? null)
                      : null
                  }
                />
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
