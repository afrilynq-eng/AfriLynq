import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES } from "@/lib/content";
import { HeadingIcon } from "@/components/HeadingIcon";

export const metadata: Metadata = {
  title: "Contact AfriLynq",
  description:
    "Reach AfriLynq by email or phone, or register as a retailer or a farmer to start sourcing.",
  alternates: { canonical: "/contact" },
};

/**
 * Contact page.
 *
 * Two routes rather than two stacked forms, so nobody scrolls past a form that
 * is not for them. The panels are a matched pair: forest green for the buying
 * side, gold for the selling side, which is the same pairing the logo uses.
 */

const PATHS = [
  {
    href: "/for-retailers",
    eyebrow: "I want to buy",
    title: "Retailers, importers and manufacturers",
    body: "Tell us what you need to source and we bring you suppliers who can meet the specification, with priced quotations you can compare.",
    action: "Join us as a retailer",
    accent: "forest" as const,
  },
  {
    href: "/for-farmers",
    eyebrow: "I want to sell",
    title: "Farmers, co-operatives, processors and exporters",
    body: "List your produce and reach buyers who already know their volume and their window. Free to list, with verification before you go live.",
    action: "Join us as a farmer",
    accent: "gold" as const,
  },
];

export default function ContactPage() {
  return (
    <>
      <section className="band-veil border-b border-sand-deep">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h1 className="text-4xl sm:text-5xl">
            Contact <span className="text-gold">AfriLynq</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Start with whichever side of the trade you are on. If you already know what
            you need, email or call us directly and skip the form.
          </p>
        </div>
      </section>

      {/* Two routes */}
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          {PATHS.map((p) => {
            const forest = p.accent === "forest";
            return (
              <article
                key={p.href}
                className={
                  "flex flex-col rounded-xl p-8 shadow-sm ring-1 " +
                  (forest
                    ? "bg-forest-deep text-paper ring-forest"
                    : "bg-gold text-forest-deep ring-gold-deep")
                }
              >
                <span
                  className={
                    "text-[0.72rem] font-semibold tracking-widest uppercase " +
                    (forest ? "text-gold" : "text-forest-deep/75")
                  }
                >
                  {p.eyebrow}
                </span>
                <h2
                  className={
                    "mt-3 text-2xl " + (forest ? "!text-paper" : "!text-forest-deep")
                  }
                >
                  {p.title}
                </h2>
                <p
                  className={
                    "mt-4 flex-1 leading-relaxed " +
                    (forest ? "text-sand-deep" : "text-forest-deep/85")
                  }
                >
                  {p.body}
                </p>
                <div className="mt-7">
                  <Link
                    href={p.href}
                    className={
                      forest
                        ? "btn-gold"
                        : "inline-block rounded bg-forest-deep px-6 py-3 font-medium text-paper transition-colors hover:bg-forest"
                    }
                  >
                    {p.action}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Direct contact */}
      <section className="band-veil border-t border-sand-deep">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="flex items-start gap-4">
            <HeadingIcon name="handshake" />
            <h2 className="text-2xl sm:text-3xl">
              Reach us <span className="text-gold">directly</span>
            </h2>
          </div>

          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-paper/92 p-6 shadow-sm ring-1 ring-sand-deep">
              <h3 className="text-lg">Email</h3>
              <p className="mt-3">
                <a
                  href="mailto:info@afrilynq.co.uk"
                  className="link-quiet text-ink-soft"
                >
                  info@afrilynq.co.uk
                </a>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-stone">
                The fastest route if you already know what you need.
              </p>
            </div>

            <div className="rounded-xl bg-paper/92 p-6 shadow-sm ring-1 ring-sand-deep">
              <h3 className="text-lg">Telephone</h3>
              <p className="mt-3">
                <a href="tel:+447721737556" className="link-quiet text-ink-soft">
                  +44 7721 737 556
                </a>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-stone">
                United Kingdom office hours.
              </p>
            </div>

            <div className="rounded-xl bg-paper/92 p-6 shadow-sm ring-1 ring-sand-deep">
              <h3 className="text-lg">Registered address</h3>
              <address className="mt-3 not-italic leading-relaxed text-ink-soft">
                AfriLynq Limited
                <br />
                58 Rockfield Road, Anfield
                <br />
                Liverpool, United Kingdom
              </address>
            </div>

            <div className="rounded-xl bg-paper/92 p-6 shadow-sm ring-1 ring-sand-deep">
              <h3 className="text-lg">What happens next</h3>
              <p className="mt-3 leading-relaxed text-ink-soft">
                We read every enquiry ourselves. Sourcing requests take longer to answer
                properly, because we go to the suppliers before we come back to you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Straight into a category */}
      <section className="band-scene border-t border-sand-deep text-paper">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="flex items-start gap-4">
            <HeadingIcon name="services" tone="gold" />
            <h2 className="text-2xl !text-paper sm:text-3xl">
              Or start from a <span className="text-gold">product</span>
            </h2>
          </div>
          <p className="mt-5 max-w-2xl leading-relaxed text-sand">
            Every product states its harvest window, the trading unit, the typical
            minimum order and what a supplier will ask you to specify.
          </p>
          <ul className="mt-7 flex flex-wrap gap-2.5">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/categories/${c.slug}`}
                  className="inline-block rounded-full border border-sand-deep/50 px-4 py-2 text-[0.95rem] text-sand transition-colors hover:border-gold hover:bg-gold hover:text-forest-deep"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
