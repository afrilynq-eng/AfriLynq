import Link from "next/link";
import { CATEGORIES, MONTHS, ORIGINS, categoryCalendar } from "@/lib/content";
import { Harvest, HarvestKey } from "@/components/Harvest";

/** The board shows the current month, so refresh the page once a day. */
export const revalidate = 86400;

export const metadata = {
  alternates: { canonical: "/" },
};

const STEPS = [
  {
    title: "Tell us what you need",
    body: "Product, volume, specification and the window you need it in. If you are not sure what is realistic, say what you are trying to buy and we will tell you.",
  },
  {
    title: "We match you to suppliers",
    body: "We go to producers and exporters in the origins that grow it, check they can meet the specification, and confirm they can export to the United Kingdom.",
  },
  {
    title: "You receive quotations",
    body: "Priced against your specification, with lead time, incoterm and packaging stated. You compare them side by side rather than chasing WhatsApp threads.",
  },
  {
    title: "You deal direct",
    body: "You contract with the supplier you choose. We stay involved to keep the paperwork moving and to step in if something goes wrong.",
  },
];

export default function HomePage() {
  const currentMonth = new Date().getMonth();

  const withCategory = CATEGORIES.flatMap((c) =>
    c.products.map((p) => ({ ...p, category: c }))
  );

  const peakNow = withCategory.filter((p) => p.calendar[currentMonth] === "peak");
  const availableNow = withCategory.filter(
    (p) => p.calendar[currentMonth] === "available"
  );

  // Some months have no peak at all. Fall back rather than leave a hole in the
  // page for part of the year.
  const atPeak = peakNow.length >= 3;
  const inSeason = (atPeak ? peakNow : [...peakNow, ...availableNow]).slice(0, 6);

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Hero. No gradient, no statistics we cannot substantiate. The first */}
      {/* thing a sourcing buyer wants is what is available and when, so the */}
      {/* seasonality board is the hero rather than an illustration.         */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-12 sm:pt-24">
        <h1 className="max-w-4xl text-4xl leading-[1.05] sm:text-6xl">
          African produce moves in seasons. Buy against the calendar, not the inbox.
        </h1>

        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-ink-soft">
          AfriLynq connects producers and exporters across Africa with buyers in the
          United Kingdom. Tell us what you need and when you need it. We find the
          suppliers who can actually meet the specification and bring you priced
          quotations you can compare.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            href="/contact#buy"
            className="btn-primary"
          >
            Tell us what you need to source
          </Link>
          <Link href="/contact#supply" className="link-quiet py-3 text-ink-soft">
            Or list produce you export
          </Link>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* The seasonality board. This is the one bold element on the page,   */}
      {/* and it is bold because it carries real information.                */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-y border-sand-deep bg-sand py-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl">
              What ships when, across the year
            </h2>
            <HarvestKey />
          </div>

          <div className="mt-9 overflow-x-auto">
            <div className="min-w-[42rem]">
              {/* Month scale, with the current month marked. */}
              <div className="flex items-end gap-6 pb-3">
                <div className="w-48 shrink-0" />
                <div className="harvest-scale tabular flex-1">
                  {MONTHS.map((m, i) => (
                    <span
                      key={m}
                      className={
                        i === currentMonth
                          ? "text-center font-semibold text-gold"
                          : "text-center"
                      }
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-sand-deep">
                {CATEGORIES.map((category) => (
                  <div
                    key={category.slug}
                    className="flex items-center gap-6 border-b border-sand-deep py-3"
                  >
                    <div className="w-48 shrink-0">
                      <Link
                        href={`/categories/${category.slug}`}
                        className="link-quiet text-[0.95rem] text-ink"
                      >
                        {category.name}
                      </Link>
                    </div>
                    <div className="flex-1">
                      <Harvest
                        calendar={categoryCalendar(category)}
                        label={category.name}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Seasons shift with rainfall and vary between origins within the same
            category. Treat this as the shape of the year rather than a guarantee, and
            confirm the window with a supplier before you plan around it.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* In season now. Real, changes monthly, and worth a return visit.    */}
      {/* ---------------------------------------------------------------- */}
      {inSeason.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl sm:text-3xl">
            {atPeak
              ? `At peak this month, ${MONTHS[currentMonth]}`
              : `Shipping this month, ${MONTHS[currentMonth]}`}
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
            {atPeak
              ? "These crops are in their main window right now, which is usually where the pricing and the availability are best."
              : "No category is at its peak this month. These are available from stock or from a secondary window."}
          </p>

          <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {inSeason.map((product) => (
              <article key={product.name} className="rule-top pt-5">
                <h3 className="text-lg">
                  <Link
                    href={`/categories/${product.category.slug}`}
                    className="link-quiet"
                  >
                    {product.name}
                  </Link>
                </h3>
                <p className="mt-1.5 text-sm text-stone">
                  {product.origins.join(", ")}
                </p>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
                  {product.note}
                </p>
                <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-sm">
                  <div>
                    <dt className="inline text-stone">Traded in </dt>
                    <dd className="inline text-ink">{product.unit}</dd>
                  </div>
                  <div>
                    <dt className="inline text-stone">From </dt>
                    <dd className="inline text-ink">{product.minimumOrder}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* How it works. This genuinely is a sequence, so it is numbered.     */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-t border-sand-deep">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl sm:text-3xl">How sourcing works here</h2>

          <ol className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="tabular block text-sm text-gold">
                  Step {i + 1}
                </span>
                <h3 className="mt-2 text-lg">{step.title}</h3>
                <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Origins.                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-t border-sand-deep">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl sm:text-3xl">Where we source from</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
            We are opening with origins that already export into the United Kingdom and
            where the paperwork is understood on both sides.
          </p>

          <div className="mt-9 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left">
              <thead>
                <tr className="border-b border-sand-deep text-sm text-stone">
                  <th scope="col" className="py-2.5 pr-6 font-medium">Country</th>
                  <th scope="col" className="py-2.5 pr-6 font-medium">Region</th>
                  <th scope="col" className="py-2.5 font-medium">Principal exports</th>
                </tr>
              </thead>
              <tbody>
                {ORIGINS.map((origin) => (
                  <tr key={origin.country} className="border-b border-sand">
                    <th scope="row" className="py-3 pr-6 font-medium text-ink">
                      {origin.country}
                    </th>
                    <td className="py-3 pr-6 text-sm text-stone">{origin.region}</td>
                    <td className="py-3 text-[0.95rem] text-ink-soft">
                      {origin.knownFor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Verification. Written to describe what we will check, without      */}
      {/* claiming a track record that does not exist yet.                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-forest-deep text-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl !text-paper sm:text-3xl">
              What we check before a supplier is listed
            </h2>
            <p className="mt-5 max-w-xl leading-relaxed text-sand-deep">
              Sourcing from a new origin usually fails on trust rather than on price.
              Every supplier on AfriLynq goes through the same checks before their
              listings become visible, and the badge on their profile says which of
              them they have passed.
            </p>
          </div>

          <ul className="space-y-5">
            {[
              ["Business registration", "Company documents from the country of registration, checked against the name on the listing."],
              ["Export capability", "Evidence of previous export shipments, or of the licences needed to make one."],
              ["Certification", "Where a certificate is claimed, we hold a copy and check its expiry date."],
              ["A named person", "One accountable contact at the company, reachable by phone."],
            ].map(([title, body]) => (
              <li key={title} className="border-l-2 border-gold pl-5">
                <h3 className="!text-paper">{title}</h3>
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-sand-deep">
                  {body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl sm:text-3xl">Buying into the United Kingdom</h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
              Send us a specification and a volume. We will tell you what is realistic
              from which origin, and what it will take to land it.
            </p>
            <Link
              href="/contact#buy"
              className="btn-primary mt-6"
            >
              Send a sourcing request
            </Link>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl">Exporting from Africa</h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
              If you grow, process or export any of the products above, register your
              interest and we will take you through verification.
            </p>
            <Link
              href="/contact#supply"
              className="btn-ghost mt-6"
            >
              List your produce
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
