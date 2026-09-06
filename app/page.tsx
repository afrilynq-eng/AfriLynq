import Link from "next/link";
import Image from "next/image";
import { CATEGORIES, ORIGINS } from "@/lib/content";
import { categoryPhoto, productPhoto, sitePhoto } from "@/lib/photos";
import { Photo } from "@/components/Photo";
import SeasonExplorer from "@/components/SeasonExplorer";
import Newsletter from "@/components/Newsletter";

/** The explorer marks the current month, so refresh the page once a day. */
export const revalidate = 86400;

export const metadata = { alternates: { canonical: "/" } };

const HERO_POINTS = [
  "Verified suppliers",
  "Seasonal sourcing intelligence",
  "Direct contracts",
  "Logistics support",
];

const STEPS = [
  {
    n: "01",
    slug: "discover",
    title: "Discover",
    body: "Browse verified suppliers and see what is in season, by product and by origin.",
  },
  {
    n: "02",
    slug: "connect",
    title: "Connect",
    body: "Send one specification and reach the suppliers who can actually meet it.",
  },
  {
    n: "03",
    slug: "trade",
    title: "Trade",
    body: "Compare priced quotations side by side, with lead time, incoterm and packaging stated.",
  },
  {
    n: "04",
    slug: "deliver",
    title: "Deliver",
    body: "Contract direct with the supplier you choose, and we keep the paperwork moving.",
  },
];

const WHY = [
  "Verified suppliers, checked before they are listed",
  "Seasonal sourcing intelligence for every product",
  "Specification led quotations you can compare",
  "Direct contracts with no hidden margin",
  "Established logistics partners",
];

const CHECKS = [
  "Business registration in the country of origin",
  "Evidence of previous export shipments",
  "Certificates held on file, with expiry dates checked",
  "One named, accountable contact",
];

export default function HomePage() {
  const currentMonth = new Date().getMonth();
  const products = CATEGORIES.flatMap((c) => c.products);

  const productPhotos = Object.fromEntries(
    products.map((p) => [p.slug, productPhoto(p.slug)])
  );

  // Counts computed from the catalogue, so they are true today and grow with
  // the platform rather than being typed in and going stale.
  const stats = [
    { value: CATEGORIES.length, label: "Product categories" },
    { value: products.length, label: "Products listed" },
    { value: ORIGINS.length, label: "Sourcing origins" },
    { value: new Set(products.flatMap((p) => p.origins)).size, label: "Export countries" },
  ];

  const hero = sitePhoto("hero");

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="relative isolate overflow-hidden bg-forest-deep">
        {hero ? (
          <Image
            src={hero}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "repeating-linear-gradient(115deg, transparent 0 22px, rgba(208,141,29,0.4) 22px 24px)",
            }}
            aria-hidden="true"
          />
        )}

        {/* Readability wash. The headline has to hold up over any photograph. */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-forest-deep via-forest-deep/85 to-forest-deep/30"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-7">
            <span className="inline-block rounded-full bg-forest-deep/70 px-4 py-1.5 text-sm text-sand ring-1 ring-sand-deep/30">
              Trusted. Transparent. Seasonal.
            </span>

            <h1 className="mt-6 max-w-2xl text-4xl leading-[1.08] !text-paper sm:text-5xl lg:text-6xl">
              Connecting Africa&apos;s producers to global markets
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-sand">
              AfriLynq is a digital marketplace connecting verified African suppliers,
              farmers and manufacturers directly with buyers across the United Kingdom
              and beyond.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/contact#buy" className="btn-primary bg-forest-soft">
                Explore as a retailer
              </Link>
              <Link
                href="/contact#supply"
                className="inline-block rounded bg-paper px-6 py-3 text-forest transition-colors hover:bg-gold hover:text-forest-deep"
              >
                Explore as a farmer
              </Link>
            </div>

            <ul className="mt-9 flex flex-wrap gap-x-8 gap-y-3">
              {HERO_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-2 text-sand">
                  <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none" aria-hidden="true">
                    <circle cx="10" cy="10" r="8.5" stroke="var(--color-gold)" strokeWidth="1.4" />
                    <path d="M6 10.3l2.6 2.6L14 7.6" stroke="var(--color-gold)" strokeWidth="1.6" />
                  </svg>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Floating join card, as in the prototype. */}
          <div className="lg:col-span-5 lg:pl-6">
            <div className="rounded-xl bg-paper p-7 shadow-xl">
              <h2 className="text-2xl">Join the AfriLynq marketplace</h2>
              <p className="mt-2 text-ink-soft">
                Trade with verified farmers and retailers.
              </p>

              <div className="mt-6 space-y-3">
                <Link
                  href="/contact#buy"
                  className="flex items-center justify-between rounded bg-forest px-5 py-3.5 text-paper transition-colors hover:bg-gold hover:text-forest-deep"
                >
                  Join as a retailer
                  <span aria-hidden="true">&rarr;</span>
                </Link>
                <Link
                  href="/contact#supply"
                  className="flex items-center justify-between rounded border border-forest px-5 py-3.5 text-forest transition-colors hover:bg-forest hover:text-paper"
                >
                  Join as a farmer
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>

              <p className="mt-5 text-sm leading-relaxed text-stone">
                We are building the supplier directory now and verifying companies one
                at a time. Register and you will be among the first listings buyers
                see.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section className="border-y border-forest-soft bg-forest">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-9 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="tabular text-3xl font-semibold text-gold sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-sand">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how-it-works" className="scroll-mt-24">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl">
              How <span className="text-gold">AfriLynq</span> works
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-lg text-ink-soft">
              From discovery to delivery, one specification and one thread instead of
              twenty.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <article
                key={step.n}
                className="relative isolate flex min-h-[19rem] flex-col justify-end overflow-hidden rounded-xl bg-forest-deep p-6"
              >
                {sitePhoto(step.slug) ? (
                  <Image
                    src={sitePhoto(step.slug)!}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 300px, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0 opacity-25"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(115deg, transparent 0 14px, rgba(208,141,29,0.5) 14px 15px)",
                    }}
                    aria-hidden="true"
                  />
                )}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-forest-deep via-forest-deep/70 to-transparent"
                  aria-hidden="true"
                />

                <span className="absolute left-6 top-6 flex h-12 w-12 items-center justify-center rounded-lg bg-gold font-semibold text-forest-deep">
                  {step.n}
                </span>

                <div className="relative">
                  <h3 className="text-xl !text-paper">{step.title}</h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-sand">
                    {step.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CATEGORIES ================= */}
      <section className="border-t border-sand-deep bg-sand">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl sm:text-4xl">
              Popular product <span className="text-gold">categories</span>
            </h2>
            <Link href="/categories" className="link-quiet text-ink-soft">
              View all products &rarr;
            </Link>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={`/categories/${category.slug}`}
                className="group overflow-hidden rounded-xl bg-paper shadow-sm transition-shadow hover:shadow-md"
              >
                <Photo
                  src={categoryPhoto(category.slug)}
                  alt={category.name}
                  label={category.name}
                  className="aspect-[4/3] w-full"
                  sizes="(min-width: 1024px) 300px, 100vw"
                />
                <div className="p-5">
                  <h3 className="text-lg">{category.name}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                    {category.summary}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-2 text-sm text-gold">
                    {category.products.length} products
                    <span aria-hidden="true">&rarr;</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SEASON EXPLORER ================= */}
      <section className="border-t border-sand-deep">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="text-3xl sm:text-4xl">What can you source, and when</h2>
          <p className="mt-3 max-w-2xl text-lg text-ink-soft">
            Pick a month to see what is shipping. Seasons shift with rainfall and vary
            between origins, so confirm the window with a supplier before you plan
            around it.
          </p>
          <div className="mt-8">
            <SeasonExplorer photos={productPhotos} initialMonth={currentMonth} />
          </div>
        </div>
      </section>

      {/* ================= WHY / VERIFICATION ================= */}
      <section className="border-t border-sand-deep bg-sand">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-16 lg:grid-cols-3">
          <div className="rounded-xl bg-paper p-7">
            <h2 className="text-2xl">
              Why choose <span className="text-gold">AfriLynq</span>
            </h2>
            <p className="mt-2 text-ink-soft">Specification and trust, not guesswork.</p>
            <ul className="mt-6 space-y-3">
              {WHY.map((item) => (
                <li key={item} className="flex gap-3 leading-relaxed text-ink-soft">
                  <svg viewBox="0 0 20 20" className="mt-1 h-5 w-5 shrink-0" fill="none" aria-hidden="true">
                    <circle cx="10" cy="10" r="9" fill="var(--color-forest)" />
                    <path d="M6 10.3l2.6 2.6L14 7.6" stroke="#fff" strokeWidth="1.7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/about" className="link-quiet mt-6 inline-block text-forest">
              Learn more about us &rarr;
            </Link>
          </div>

          <div className="rounded-xl bg-paper p-7">
            <h2 className="text-2xl">What we check before a supplier is listed</h2>
            <p className="mt-2 text-ink-soft">
              Sourcing from a new origin usually fails on trust rather than on price.
            </p>
            <ul className="mt-6 space-y-3">
              {CHECKS.map((item) => (
                <li key={item} className="flex gap-3 leading-relaxed text-ink-soft">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm leading-relaxed text-stone">
              The badge on a supplier profile says which of these they have passed, so
              you can see the basis for the claim rather than take it on trust.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl bg-forest-deep">
            <Photo
              src={sitePhoto("verification")}
              alt=""
              label="Quality inspection at origin"
              className="aspect-[4/3] w-full"
              sizes="(min-width: 1024px) 380px, 100vw"
            />
            <div className="p-7">
              <h2 className="text-2xl !text-paper">Built for the United Kingdom market</h2>
              <p className="mt-3 leading-relaxed text-sand-deep">
                Every category page states what a supplier will ask you to specify, and
                what the United Kingdom requires on arrival. Establishment numbers for
                fish, aflatoxin limits for groundnuts, residue testing for honey. The
                things that stop a shipment are on the page before you enquire.
              </p>
              <Link href="/categories" className="btn-gold mt-6">
                See what we source
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= NEWSLETTER ================= */}
      <Newsletter />
    </>
  );
}
