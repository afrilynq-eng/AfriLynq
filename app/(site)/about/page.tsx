import type { Metadata } from "next";
import Link from "next/link";
import { ORIGINS } from "@/lib/content";
import { sitePhoto } from "@/lib/photos";
import { Photo } from "@/components/Photo";
import { HeadingIcon, type IconName } from "@/components/HeadingIcon";

export const metadata: Metadata = {
  title: "About AfriLynq",
  description:
    "AfriLynq is a digital marketplace connecting trusted African suppliers, farmers and manufacturers with businesses and buyers in the United Kingdom and beyond.",
  alternates: { canonical: "/about" },
};

/**
 * About page.
 *
 * Follows AfriLynq's own company flyer: the two line headline with the second
 * line in gold, the strapline on a solid green band, the mission held in a
 * badge that overlaps the photograph, and the six service lines each carrying
 * its icon above the heading rather than beside it.
 *
 * No patterned background on this page. The client asked for it removed here
 * because it competed with the reading.
 */

const SERVICES: { icon: IconName; slug: string; title: string; body: string }[] = [
  {
    icon: "sourcing",
    slug: "service-sourcing",
    title: "Agricultural product sourcing",
    body: "We connect you with quality African produce that meets the standards your market requires, from the origins where it actually grows well.",
  },
  {
    icon: "verified",
    slug: "service-verification",
    title: "Supplier verification",
    body: "We verify and onboard trusted suppliers before they are listed, so the company you are dealing with is one we have checked rather than one you found.",
  },
  {
    icon: "trade-support",
    slug: "service-trade-support",
    title: "Import and export support",
    body: "End to end guidance through the documentation, certification and compliance that international trade requires, on both sides of the shipment.",
  },
  {
    icon: "connections",
    slug: "service-connections",
    title: "B2B business connections",
    body: "Meaningful introductions between buyers and reliable African suppliers, matched on volume, specification and capability rather than on who answered first.",
  },
  {
    icon: "facilitation",
    slug: "service-facilitation",
    title: "Trade facilitation",
    body: "We keep trade moving smoothly and compliantly across borders, holding the paperwork together and stepping in when something needs resolving.",
  },
  {
    icon: "logistics",
    slug: "service-logistics",
    title: "Logistics partnerships",
    body: "We work with trusted logistics partners so that goods arrive safely and on time, on the terms that were agreed.",
  },
];

/**
 * Country name split across the two brand colours, the way AfriLynq is set in
 * the logo: forest green then gold. A single word splits at roughly its
 * midpoint, so South Africa reads South in green and Africa in gold, and
 * Ghana reads Gha then na.
 */
function TwoTone({ name }: { name: string }) {
  const words = name.split(" ");
  if (words.length > 1) {
    return (
      <>
        {words[0]} <span className="text-gold">{words.slice(1).join(" ")}</span>
      </>
    );
  }
  const cut = Math.ceil(name.length / 2);
  return (
    <>
      {name.slice(0, cut)}
      <span className="text-gold">{name.slice(cut)}</span>
    </>
  );
}

/** Section heading with its icon above it, as set out in the company flyer. */
function Heading({
  icon,
  lead,
  accent,
  centred = false,
  tone = "forest",
}: {
  icon: IconName;
  lead: string;
  accent: string;
  centred?: boolean;
  tone?: "forest" | "gold";
}) {
  return (
    <div className={centred ? "flex flex-col items-center text-center" : ""}>
      <HeadingIcon name={icon} tone={tone} />
      <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
        {lead} <span className="text-gold">{accent}</span>
      </h2>
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      {/* ================= OPENING ================= */}
      <section className="band-veil-paper">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-10">
          <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Bridging continents.
            <br />
            <span className="text-gold">Creating opportunities.</span>
          </h1>
          <p className="mt-6 inline-block rounded bg-forest px-5 py-3 text-base font-semibold italic tracking-wide !text-paper uppercase sm:text-lg">
            Empowering growth. Enriching lives.
          </p>
        </div>
      </section>

      {/* ================= PHOTOGRAPH ================= */}
      <section className="band-veil-paper">
        <div className="mx-auto max-w-6xl px-6 pb-12">
          <Photo
            src={sitePhoto("about")}
            alt="African agricultural producers at work"
            label="Photograph of producers at origin"
            className="aspect-[21/9] w-full rounded-xl"
            sizes="(min-width: 1280px) 1152px, 100vw"
            priority
          />
        </div>
      </section>

      {/* ================= MISSION ================= */}
      {/* Stands on its own beneath the photograph rather than sitting over it.
          The client asked for this: the badge was covering the picture. */}
      <section className="band-veil-paper">
        <div className="mx-auto max-w-4xl px-6 pb-16">
          <div className="rounded-2xl bg-forest-deep px-8 py-10 text-center shadow-lg ring-1 ring-gold/30 sm:px-12">
            <div className="flex justify-center">
              <HeadingIcon name="mission" tone="gold" />
            </div>
            <h2 className="mt-4 text-xl font-bold tracking-wide !text-paper uppercase sm:text-2xl">
              Our <span className="text-gold">mission</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-sand">
              To be the leading platform driving sustainable trade between Africa
              and the world, empowering businesses and communities for
              generational impact.
            </p>
          </div>
        </div>
      </section>

      {/* ================= ABOUT AFRILYNQ ================= */}
      <section className="band-veil border-y border-sand-deep">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Heading icon="sprout" lead="About" accent="AfriLynq" />
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-soft">
            AfriLynq is a digital marketplace that connects trusted African
            suppliers, farmers and manufacturers with businesses and buyers in the
            United Kingdom and beyond. We simplify sourcing, promote secure trade,
            and help African products reach global markets through reliable
            partnerships and innovative technology.
          </p>
        </div>
      </section>

      {/* ================= WHAT WE DO ================= */}
      <section className="band-veil">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Heading icon="services" lead="What we" accent="do" centred />

          <div className="mt-12 grid gap-x-8 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => {
              const shot = sitePhoto(service.slug);
              return (
                <article
                  key={service.title}
                  className="overflow-hidden rounded-xl bg-paper/90 shadow-sm ring-1 ring-sand-deep"
                >
                  <div className="relative isolate">
                    <Photo
                      src={shot}
                      alt=""
                      label={service.title}
                      className="aspect-[16/10] w-full"
                      sizes="(min-width: 1024px) 360px, 100vw"
                    />
                    <span className="absolute -bottom-7 left-1/2 -translate-x-1/2">
                      <HeadingIcon name={service.icon} size="sm" />
                    </span>
                  </div>
                  <div className="px-6 pt-11 pb-7 text-center">
                    <h3 className="text-base font-bold tracking-wide uppercase">
                      {service.title}
                    </h3>
                    <p className="mt-3 leading-relaxed text-ink-soft">
                      {service.body}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= HOW AND WHERE ================= */}
      <section className="band-veil border-y border-sand-deep">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2">
          <div>
            <Heading icon="compass" lead="How we" accent="work" />
            <div className="mt-6 space-y-4 leading-relaxed text-ink-soft">
              <p>
                We are not a trader. We do not buy your produce and sell it on at a
                margin you cannot see, and we do not take a position in the goods.
              </p>
              <p>
                The contract of sale is between the buyer and the supplier. We make
                the introduction, hold the specification, and stay involved while
                the order moves. Where a shipment runs into difficulty we help both
                sides resolve it. That distinction matters, and both sides deserve
                to know it from the start.
              </p>
            </div>
          </div>

          <div>
            <Heading icon="bridge" lead="Two sides that" accent="rarely meet" />
            <div className="mt-6 space-y-4 leading-relaxed text-ink-soft">
              <p>
                A buyer in the United Kingdom wants forty tonnes of white sesame at
                a stated purity, delivered in March. A co-operative in Jigawa has
                it. Neither can find the other, and the introductions that do happen
                come through a chain of agents who add cost without adding
                certainty.
              </p>
              <p>
                AfriLynq exists to shorten that chain, and to put a verified name
                and a real specification at each end of it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= ORIGINS ================= */}
      <section className="band-veil-paper">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Heading icon="globe" lead="Origins we" accent="work with" centred />

          <p className="mx-auto mt-6 max-w-3xl text-center leading-relaxed text-ink-soft">
            Every origin has its own export authority, its own certification regime
            and its own idea of what a phytosanitary certificate should look like.
            These are the countries we trade from today, and the list grows as
            suppliers are verified.
          </p>

          <ul className="mt-12 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {ORIGINS.map((origin) => (
              <li key={origin.country} className="rule-top pt-4">
                <h3 className="text-lg font-bold">
                  <TwoTone name={origin.country} />
                </h3>
                <p className="mt-1 text-sm font-bold text-stone">{origin.region}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ================= PARTNER ================= */}
      <section className="band-scene border-t border-sand-deep text-paper">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <div className="flex justify-center">
            <HeadingIcon name="handshake" tone="gold" />
          </div>
          <h2 className="mx-auto mt-4 max-w-2xl text-2xl font-bold tracking-wide !text-paper uppercase sm:text-3xl">
            Partner with <span className="text-gold">AfriLynq</span> today
          </h2>
          <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-sand">
            Unlock new business opportunities across Africa and the world. Whether
            you are sourcing or exporting, start with a conversation about what you
            actually need.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link href="/for-retailers" className="btn-gold">
              Join us as a retailer
            </Link>
            <Link
              href="/for-farmers"
              className="inline-block rounded border border-sand-deep px-6 py-3 text-paper transition-colors hover:bg-paper hover:text-forest"
            >
              Join us as a farmer
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
