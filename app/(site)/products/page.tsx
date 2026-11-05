import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, ORIGINS, MONTHS } from "@/lib/content";
import { productPhoto } from "@/lib/photos";
import { Photo } from "@/components/Photo";
import { liveOfferCounts } from "@/lib/catalogue";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "What we source",
  description:
    "The reference list of every product AfriLynq sources, with local names, origins, seasons, trading units and minimum orders, and how many suppliers are offering each one today.",
  alternates: { canonical: "/products" },
};

/**
 * All products, standalone.
 *
 * The client asked for one page carrying every product rather than a set of
 * category pages. Categories are kept as data underneath, for filtering and
 * for the enquiry forms, but they are not the way this page is organised.
 *
 * Filtering is done with plain links and a form rather than client side state,
 * so the page stays server rendered and every filtered view has its own URL
 * that can be shared and indexed.
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; origin?: string }>;
}) {
  const { q, origin } = await searchParams;

  const all = CATEGORIES.flatMap((c) =>
    c.products.map((p) => ({ ...p, category: c.slug, categoryName: c.name }))
  ).sort((a, b) => a.name.localeCompare(b.name));

  const needle = (q ?? "").trim().toLowerCase();

  const products = all.filter((p) => {
    if (origin && !p.origins.includes(origin)) return false;
    if (!needle) return true;
    return (
      p.name.toLowerCase().includes(needle) ||
      (p.localName ?? "").toLowerCase().includes(needle) ||
      p.origins.join(" ").toLowerCase().includes(needle) ||
      p.categoryName.toLowerCase().includes(needle)
    );
  });

  const filtered = Boolean(needle || origin);

  // How many suppliers are offering each of these today. One query for the
  // page; see liveOfferCounts for why the count is defined the way it is.
  const offers = await liveOfferCounts(products.map((p) => p.name));
  const withOffers = products.filter((p) => (offers.get(p.name) ?? 0) > 0).length;

  return (
    <>
      {/* ================= OPENING ================= */}
      <section className="band-veil border-b border-sand-deep">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <p className="text-sm font-semibold tracking-widest text-gold uppercase">
            Reference catalogue
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            What we <span className="text-gold">source</span>
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-soft">
            {all.length} products from {ORIGINS.length} African origins, listed by
            the names buyers actually use. Each one states its season, trading unit,
            typical minimum order and what a supplier will ask you to specify.
          </p>

          {/* The thing that separates this page from the marketplace, said
              plainly rather than left for a visitor to work out. The two
              pages are grids of produce with a search box, and nothing on
              either one used to say which was which. */}
          <div className="mt-6 max-w-3xl rounded-lg border border-sand-deep bg-paper/80 p-5">
            <p className="leading-relaxed text-ink-soft">
              <strong className="font-semibold text-ink">
                This is the catalogue, not the stock list.
              </strong>{" "}
              It is everything AfriLynq can source, whether or not a supplier
              has it listed right now. To see what is actually being offered
              today, with quantities, prices and the supplier behind each
              one, go to the{" "}
              <Link href="/marketplace" className="link-quiet text-forest">
                marketplace
              </Link>
              .
            </p>
          </div>

          {/* Search and origin filter. Plain links and a GET form, so every view
              has a shareable URL. */}
          <form className="mt-8 flex flex-wrap gap-2.5" action="/products">
            <label htmlFor="q" className="sr-only">
              Search products
            </label>
            <input
              id="q"
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search a product, a local name or an origin"
              className="w-full max-w-md rounded border border-sand-deep bg-paper px-4 py-2.5 text-ink placeholder:text-stone"
            />
            {origin && <input type="hidden" name="origin" value={origin} />}
            <button type="submit" className="btn-primary">
              Search
            </button>
            {filtered && (
              <Link href="/products" className="btn-ghost">
                Clear
              </Link>
            )}
          </form>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={q ? `/products?q=${encodeURIComponent(q)}` : "/products"}
              className={
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors " +
                (!origin
                  ? "border-forest bg-forest text-paper"
                  : "border-sand-deep bg-paper/85 text-ink-soft hover:border-gold")
              }
            >
              All origins
            </Link>
            {ORIGINS.map((o) => {
              const params = new URLSearchParams();
              if (q) params.set("q", q);
              params.set("origin", o.country);
              const active = origin === o.country;
              return (
                <Link
                  key={o.country}
                  href={`/products?${params.toString()}`}
                  className={
                    "rounded-full border px-3.5 py-1.5 text-sm transition-colors " +
                    (active
                      ? "border-gold bg-gold text-forest-deep"
                      : "border-sand-deep bg-paper/85 text-ink-soft hover:border-gold")
                  }
                >
                  {o.country}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= THE GRID ================= */}
      <section className="band-veil-paper">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <p className="text-sm text-stone">
            {products.length === all.length
              ? `Showing all ${all.length} products`
              : `${products.length} of ${all.length} products`}
            {withOffers > 0 && (
              <>
                {" · "}
                <Link href="/marketplace" className="link-quiet text-forest">
                  {withOffers} with live offers today
                </Link>
              </>
            )}
          </p>

          {products.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-lg text-ink-soft">
                Nothing matches that. Try a broader term, or tell us what you are
                looking for and we will go and find it.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-4">
                <Link href="/products" className="btn-ghost">
                  Show everything
                </Link>
                <Link href="/contact" className="btn-primary">
                  Send a sourcing request
                </Link>
              </div>
            </div>
          ) : (
            <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((p) => {
                const peak = p.calendar
                  .map((v, i) => (v === "peak" ? MONTHS[i] : null))
                  .filter(Boolean);
                const live = offers.get(p.name) ?? 0;

                /**
                 * The card is no longer one big link.
                 *
                 * It carries two destinations now, and they are different
                 * questions: the produce itself goes to the reference page
                 * for its category, and the live offers go to the
                 * marketplace. A link inside a link is not valid markup
                 * anyway, so the photograph and the name carry the first
                 * and the footer strip carries the second.
                 */
                return (
                  <li key={p.slug} className="flex">
                    <div className="group flex h-full w-full flex-col overflow-hidden rounded-lg bg-paper shadow-sm transition-shadow hover:shadow-md">
                      <Link
                        href={`/categories/${p.category}`}
                        className="flex flex-1 flex-col"
                      >
                        <Photo
                          src={productPhoto(p.slug)}
                          alt={p.name}
                          label={p.name}
                          className="aspect-square w-full"
                          sizes="(min-width: 1280px) 220px, (min-width: 1024px) 240px, (min-width: 640px) 30vw, 45vw"
                        />
                        <div className="flex flex-1 flex-col p-3.5">
                          <h2 className="text-[0.95rem] leading-snug font-semibold">
                            {p.name}
                          </h2>
                          {p.localName && (
                            <p className="mt-0.5 text-xs leading-snug text-gold">
                              {p.localName}
                            </p>
                          )}
                          <p className="mt-2 text-xs leading-snug text-stone">
                            {p.origins.slice(0, 2).join(", ")}
                            {p.origins.length > 2 && ` +${p.origins.length - 2}`}
                          </p>
                          <p className="mt-auto pt-2 text-xs text-ink-soft">
                            {peak.length > 0
                              ? `Peak ${peak.join(" ")}`
                              : "Year round"}
                          </p>
                        </div>
                      </Link>

                      {live > 0 ? (
                        <Link
                          href={`/marketplace?q=${encodeURIComponent(p.name)}`}
                          className="border-t border-sand bg-forest/5 px-3.5 py-2.5 text-xs font-medium text-forest transition-colors hover:bg-forest hover:text-paper"
                        >
                          {live} live {live === 1 ? "offer" : "offers"} &rarr;
                        </Link>
                      ) : (
                        <p className="border-t border-sand px-3.5 py-2.5 text-xs text-stone">
                          No live offers yet
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ================= CLOSE ================= */}
      <section className="band-scene border-t border-sand-deep text-paper">
        <div className="mx-auto max-w-3xl px-6 py-14 text-center">
          <h2 className="text-2xl !text-paper sm:text-3xl">
            Cannot find what you <span className="text-gold">need?</span>
          </h2>
          <p className="mt-4 leading-relaxed text-sand">
            This is what we source today and the list grows as suppliers are
            verified. Tell us the product, the volume and the window, and we will
            go to the origins on your behalf.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/for-retailers" className="btn-gold">
              Send a sourcing request
            </Link>
            <Link
              href="/for-farmers"
              className="inline-block rounded border border-sand-deep px-6 py-3 text-paper transition-colors hover:bg-paper hover:text-forest"
            >
              I supply this
            </Link>
            <Link
              href="/for-shoppers"
              className="inline-block rounded border border-sand-deep px-6 py-3 text-paper transition-colors hover:bg-paper hover:text-forest"
            >
              I am buying for myself
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
