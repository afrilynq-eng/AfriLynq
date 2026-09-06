import type { Metadata } from "next";
import Link from "next/link";
import { ORIGINS } from "@/lib/content";
import { sitePhoto } from "@/lib/photos";
import { Photo } from "@/components/Photo";

export const metadata: Metadata = {
  title: "About AfriLynq",
  description:
    "AfriLynq is a digital marketplace connecting trusted African suppliers, farmers and manufacturers with businesses and buyers in the United Kingdom and beyond.",
  alternates: { canonical: "/about" },
};

/** AfriLynq's own six service lines, from the company brochure. */
const SERVICES = [
  {
    title: "Agricultural product sourcing",
    body: "We connect you with quality African produce that meets the standards your market requires, from the origins where it actually grows well.",
  },
  {
    title: "Supplier verification",
    body: "We verify and onboard suppliers before they are listed, so that the company you are dealing with is one we have checked rather than one you found.",
  },
  {
    title: "Import and export support",
    body: "Guidance through the documentation, certification and compliance that international trade requires, on both sides of the shipment.",
  },
  {
    title: "Business connections",
    body: "Introductions between buyers and suppliers who are genuinely matched on volume, specification and capability, rather than on who answered first.",
  },
  {
    title: "Trade facilitation",
    body: "We stay involved while an order moves, keeping the paperwork going and stepping in when something needs resolving.",
  },
  {
    title: "Logistics partnerships",
    body: "We work with established freight and logistics partners so goods arrive intact, on the terms that were agreed.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-12">
        <h1 className="max-w-4xl text-4xl sm:text-5xl">
          Bridging continents. Creating opportunities.
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-ink-soft">
          AfriLynq is a digital marketplace that connects trusted African suppliers,
          farmers and manufacturers with businesses and buyers in the United Kingdom
          and beyond. We simplify sourcing, support secure trade, and help African
          products reach global markets through reliable partnerships.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-14">
        <Photo
          src={sitePhoto("about")}
          alt="African agricultural producers at work"
          label="Photograph of producers at origin"
          className="aspect-[21/9] w-full"
          sizes="(min-width: 1280px) 1152px, 100vw"
          priority
        />
      </section>

      <section className="border-y border-sand-deep bg-sand">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl sm:text-3xl">Our mission</h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
              To be the leading platform driving sustainable trade between Africa and
              the world, empowering businesses and communities for generational
              impact.
            </p>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl">Two sides of a trade that rarely meet</h2>
            <div className="mt-5 space-y-4 leading-relaxed text-ink-soft">
              <p>
                A buyer in the United Kingdom wants forty tonnes of white sesame at a
                stated purity, delivered in March. A co-operative in Jigawa has it.
                Neither can find the other, and the introductions that do happen come
                through a chain of agents who add cost without adding certainty.
              </p>
              <p>
                AfriLynq exists to shorten that chain, and to put a verified name and a
                real specification at each end of it.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl sm:text-3xl">What we do</h2>
        <div className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => (
            <div key={service.title} className="rule-top pt-5">
              <h3 className="text-lg">{service.title}</h3>
              <p className="mt-2.5 leading-relaxed text-ink-soft">{service.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-sand-deep">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl sm:text-3xl">How we work</h2>
            <div className="mt-5 space-y-4 leading-relaxed text-ink-soft">
              <p>
                We are not a trader. We do not buy your produce and sell it on at a
                margin you cannot see, and we do not take a position in the goods.
              </p>
              <p>
                The contract of sale is between the buyer and the supplier. We make the
                introduction, hold the specification, and stay involved while the order
                moves. Where a shipment runs into difficulty we help both sides resolve
                it. That distinction matters, and both sides deserve to know it from the
                start.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl">Where we are</h2>
            <div className="mt-5 space-y-4 leading-relaxed text-ink-soft">
              <p>
                AfriLynq is early. We are building the supplier directory now, verifying
                companies one at a time rather than importing a list from somewhere and
                calling it a marketplace.
              </p>
              <p>
                If you send us a sourcing request today, the answer may be that we can
                reach two suppliers for your product rather than twenty, and we will
                tell you that rather than stall. If you are a supplier, it means you are
                early enough to be among the first listings buyers see.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-sand-deep bg-forest-deep text-paper">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="max-w-2xl text-2xl !text-paper sm:text-3xl">
            Partner with AfriLynq
          </h2>
          <p className="mt-5 max-w-2xl leading-relaxed text-sand-deep">
            Whether you are sourcing into the United Kingdom or exporting from Africa,
            start with a conversation about what you actually need.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/contact#buy" className="btn-gold">
              Send a sourcing request
            </Link>
            <Link
              href="/contact#supply"
              className="inline-block rounded border border-sand-deep px-6 py-3 text-paper transition-colors hover:bg-paper hover:text-forest"
            >
              List your produce
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl sm:text-3xl">Origins we work with</h2>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          Every origin has its own export authority, its own certification regime and
          its own idea of what a phytosanitary certificate should look like. Rather
          than claim to cover a continent, we opened with the countries where the route
          into the United Kingdom is already established and where we know the
          paperwork.
        </p>

        <ul className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          {ORIGINS.map((origin) => (
            <li key={origin.country} className="rule-top pt-4">
              <h3 className="text-lg">{origin.country}</h3>
              <p className="mt-1 text-sm text-stone">{origin.region}</p>
              <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-soft">
                {origin.knownFor}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
