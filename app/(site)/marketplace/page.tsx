import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, ORIGINS } from "@/lib/content";
import { HeadingIcon, type IconName } from "@/components/HeadingIcon";
import { sitePhoto } from "@/lib/photos";
import { Photo } from "@/components/Photo";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "The AfriLynq marketplace is being built. Suppliers are being verified and listed now, and buyers can register to be first through the door.",
  alternates: { canonical: "/marketplace" },
};

/**
 * Marketplace holding page.
 *
 * The browsable marketplace, supplier listings and accounts are Stage 2. This
 * page exists so the navigation resolves to something honest rather than to a
 * dead link or an empty grid, and so registrations keep arriving while it is
 * being built.
 */

const COMING: {
  icon: IconName;
  slug: string;
  title: string;
  body: string;
  /** A badge or mark has to be shown whole. A photograph can be cropped. */
  fit?: "cover" | "contain";
}[] = [
  {
    icon: "services",
    slug: "marketplace-listings",
    title: "Live supplier listings",
    body: "Products listed by verified suppliers themselves, with their own quantities, harvest windows and certifications against each one.",
  },
  {
    icon: "verified",
    slug: "marketplace-verification",
    fit: "contain",
    title: "Verification badges",
    body: "Every supplier carrying a badge that states which checks they have passed, so the claim is visible rather than taken on trust.",
  },
  {
    icon: "connections",
    slug: "marketplace-accounts",
    title: "Buyer and supplier accounts",
    body: "Sign in to manage your listings, track the enquiries you have sent, and pick up conversations where you left them.",
  },
  {
    icon: "trade-support",
    slug: "marketplace-quotations",
    title: "Enquiries and quotations",
    body: "Send one specification to the suppliers who can meet it, and compare priced quotations side by side.",
  },
];

export default function MarketplacePage() {
  const products = CATEGORIES.flatMap((c) => c.products).length;
  const hero = sitePhoto("marketplace");

  return (
    <>
      {/* ================= OPENING ================= */}
      <section className="band-scene relative isolate overflow-hidden text-paper">
        {hero ? (
          <Image src={hero} alt="" fill priority sizes="100vw" className="object-cover" />
        ) : null}
        <div
          className="absolute inset-0 bg-gradient-to-b from-forest-deep/92 via-forest-deep/86 to-forest-deep/94"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-5xl px-6 py-20 text-center">
          <span className="inline-block rounded-full border border-gold/40 px-4 py-1.5 text-sm text-gold">
            Waiting for listings
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl !text-paper sm:text-5xl">
            The marketplace is being{" "}
            <span className="text-gold">built right now</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-sand">
            We are verifying suppliers one at a time rather than importing a list
            from somewhere and calling it a marketplace. {products} products are
            already catalogued across {ORIGINS.length} African origins. What comes
            next is the suppliers behind them.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link href="/for-farmers" className="btn-gold">
              List your produce
            </Link>
            <Link
              href="/for-retailers"
              className="inline-block rounded border border-sand-deep px-6 py-3 text-paper transition-colors hover:bg-paper hover:text-forest"
            >
              Register as a buyer
            </Link>
          </div>
        </div>
      </section>

      {/* ================= WHAT IS COMING ================= */}
      <section className="band-veil border-b border-sand-deep">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col items-center text-center">
            <HeadingIcon name="sprout" />
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              What the marketplace will{" "}
              <span className="text-gold">do</span>
            </h2>
          </div>

          <div className="mt-12 grid gap-x-8 gap-y-11 sm:grid-cols-2">
            {COMING.map((item) => (
              <article
                key={item.title}
                className="overflow-hidden rounded-xl bg-paper/90 shadow-sm ring-1 ring-sand-deep"
              >
                <div className="relative isolate">
                  <Photo
                    src={sitePhoto(item.slug)}
                    alt=""
                    label={item.title}
                    className="aspect-[16/10] w-full"
                    sizes="(min-width: 1024px) 460px, 100vw"
                    fit={item.fit ?? "cover"}
                  />
                  <span className="absolute -bottom-7 left-6">
                    <HeadingIcon name={item.icon} size="sm" />
                  </span>
                </div>
                <div className="px-6 pt-11 pb-7">
                  <h3 className="text-base font-bold tracking-wide uppercase">
                    {item.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-ink-soft">{item.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ================= MEANWHILE ================= */}
      <section className="band-veil-paper">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            In the <span className="text-gold">meantime</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-ink-soft">
            Everything we source is already catalogued, with its season, trading
            unit, typical minimum order and what a supplier will ask you to
            specify. Send us what you need and we go to the suppliers on your
            behalf.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link href="/categories" className="btn-primary">
              Browse the catalogue
            </Link>
            <Link href="/contact" className="btn-ghost">
              Send a sourcing request
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
