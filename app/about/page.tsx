import type { Metadata } from "next";
import Link from "next/link";
import { ORIGINS } from "@/lib/content";

export const metadata: Metadata = {
  title: "About AfriLynq",
  description:
    "AfriLynq is a United Kingdom based sourcing platform connecting agricultural producers across Africa with buyers importing into Britain.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-12">
        <h1 className="max-w-3xl text-4xl sm:text-5xl">
          Two sides of a trade that rarely meet
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-ink-soft">
          A buyer in Liverpool wants forty tonnes of white sesame at a stated purity,
          delivered in March. A co-operative in Jigawa has it. Neither can find the
          other, and the introductions that do happen come through a chain of agents
          who add cost without adding certainty. AfriLynq exists to shorten that
          chain.
        </p>
      </section>

      <section className="border-y border-sand-deep bg-sand">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl sm:text-3xl">What we do</h2>
            <div className="mt-5 space-y-4 leading-relaxed text-ink-soft">
              <p>
                We verify agricultural suppliers across Africa, publish what they can
                supply, and put United Kingdom buyers in front of them with a
                specification rather than a vague enquiry.
              </p>
              <p>
                Buyers get quotations they can compare on the same terms. Suppliers get
                orders from buyers who have already been told what a container costs
                and how long it takes. Both sides deal with a named company rather than
                an anonymous phone number.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl">What we do not do</h2>
            <div className="mt-5 space-y-4 leading-relaxed text-ink-soft">
              <p>
                We are not a trader. We do not buy your produce and sell it on at a
                margin you cannot see, and we do not take a position in the goods.
              </p>
              <p>
                The contract of sale is between the buyer and the supplier. We make the
                introduction, hold the specification, and stay involved while the order
                moves. Where a shipment goes wrong, we help both sides sort it out, but
                we are not the counterparty and we do not pretend to be.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl sm:text-3xl">Why we started with these origins</h2>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          Every origin has its own export authority, its own certification regime and
          its own idea of what a phytosanitary certificate should look like. Rather than
          claim to cover a continent, we opened with the countries where the route into
          the United Kingdom is already established and where we know the paperwork.
        </p>

        <ul className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
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

      <section className="bg-forest-deep text-paper">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="max-w-2xl text-2xl !text-paper sm:text-3xl">
            Being straight about where we are
          </h2>
          <div className="mt-6 max-w-2xl space-y-4 leading-relaxed text-sand-deep">
            <p>
              AfriLynq is early. We are building the supplier directory now, verifying
              companies one at a time rather than importing a list from somewhere and
              calling it a marketplace.
            </p>
            <p>
              That means if you send us a sourcing request today, the answer may be that
              we can reach two suppliers for your product rather than twenty, and we
              will tell you that rather than stall. If you are a supplier, it means you
              are early enough to be one of the first listings buyers see.
            </p>
          </div>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/contact#buy"
              className="btn-gold"
            >
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
    </>
  );
}
