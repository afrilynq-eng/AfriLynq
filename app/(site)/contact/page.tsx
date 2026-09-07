import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact AfriLynq",
  description:
    "Reach AfriLynq by email or phone, or register as a retailer or a farmer to start sourcing.",
  alternates: { canonical: "/contact" },
};

/**
 * Contact page.
 *
 * Previously two long forms stacked on one page, which asked a visitor to
 * scroll past a form that was not for them. Now it routes: pick the path that
 * describes you, or contact us directly. The forms live on their own pages
 * where the person arriving has already decided.
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
      <section className="border-b border-sand-deep bg-sand">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h1 className="text-4xl sm:text-5xl">Contact</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Start with whichever side of the trade you are on. If you already know what
            you need, email or call us directly and skip the form.
          </p>
        </div>
      </section>

      {/* Two routes */}
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          {PATHS.map((p) => (
            <article
              key={p.href}
              className={`flex flex-col rounded-xl p-8 ring-1 ${
                p.accent === "forest"
                  ? "bg-forest-deep text-paper ring-forest"
                  : "bg-paper ring-sand-deep"
              }`}
            >
              <span
                className={`text-[0.72rem] font-semibold tracking-widest uppercase ${
                  p.accent === "forest" ? "text-gold" : "text-gold"
                }`}
              >
                {p.eyebrow}
              </span>
              <h2
                className={`mt-3 text-2xl ${p.accent === "forest" ? "!text-paper" : ""}`}
              >
                {p.title}
              </h2>
              <p
                className={`mt-4 flex-1 leading-relaxed ${
                  p.accent === "forest" ? "text-sand-deep" : "text-ink-soft"
                }`}
              >
                {p.body}
              </p>
              <div className="mt-7">
                <Link
                  href={p.href}
                  className={p.accent === "forest" ? "btn-gold" : "btn-primary"}
                >
                  {p.action}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Direct contact */}
      <section className="border-t border-sand-deep">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className="text-lg">Email</h2>
            <p className="mt-3">
              <a href="mailto:info@afrilynq.co.uk" className="link-quiet text-ink-soft">
                info@afrilynq.co.uk
              </a>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone">
              The fastest route if you already know what you need.
            </p>
          </div>

          <div>
            <h2 className="text-lg">Telephone</h2>
            <p className="mt-3">
              <a href="tel:+447721737556" className="link-quiet text-ink-soft">
                +44 7721 737 556
              </a>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone">
              United Kingdom office hours.
            </p>
          </div>

          <div>
            <h2 className="text-lg">Registered address</h2>
            <address className="mt-3 not-italic leading-relaxed text-ink-soft">
              58 Rockfield Road, Anfield
              <br />
              Liverpool, United Kingdom
            </address>
          </div>

          <div>
            <h2 className="text-lg">What happens next</h2>
            <p className="mt-3 leading-relaxed text-ink-soft">
              We read every enquiry ourselves. Sourcing requests take longer to answer
              properly, because we go to the suppliers before we come back to you.
            </p>
          </div>
        </div>
      </section>

      {/* Straight into a category */}
      <section className="border-t border-sand-deep bg-sand">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h2 className="text-2xl sm:text-3xl">Or start from a product</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
            Every category page states the harvest window, the trading unit, the typical
            minimum order and what a supplier will ask you to specify.
          </p>
          <ul className="mt-7 flex flex-wrap gap-2.5">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/categories/${c.slug}`}
                  className="inline-block rounded-full border border-sand-deep bg-paper px-4 py-2 text-[0.95rem] text-ink-soft transition-colors hover:border-gold hover:text-forest"
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
