import Link from "next/link";
import Image from "next/image";
import { sitePhoto } from "@/lib/photos";
import { HeadingIcon, type IconName } from "@/components/HeadingIcon";
import { Photo } from "@/components/Photo";

/** The four approved how-it-works photographs, reused on both audience pages. */
const STEP_PHOTOS = ["discover", "connect", "trade", "deliver"];

/**
 * What you get: an icon and a photograph per benefit, keyed by position so the
 * content file does not have to carry presentation detail. Buyers and
 * suppliers get their own photo slugs, since the two audiences want to see
 * different things.
 */
/**
 * Photographs that crop badly from the centre, anchored to keep what
 * matters. Add a slug here if a picture loses a face or its subject.
 */
const FOCUS: Record<string, "top" | "bottom"> = {
  "gain-shopper-2": "top",
  "gain-shopper-5": "top",
};
const GAIN_ICONS: IconName[] = [
  "verified",
  "trade-support",
  "connections",
  "sourcing",
  "facilitation",
  "logistics",
];

const GAIN_PHOTOS: Record<Audience["kind"], string[]> = {
  buyer: ["gain-buyer-1", "gain-buyer-2", "gain-buyer-3", "gain-buyer-4", "gain-buyer-5", "gain-buyer-6"],
  supplier: ["gain-farmer-1", "gain-farmer-2", "gain-farmer-3", "gain-farmer-4", "gain-farmer-5", "gain-farmer-6"],
  shopper: ["gain-shopper-1", "gain-shopper-2", "gain-shopper-3", "gain-shopper-4", "gain-shopper-5", "gain-shopper-6"],
};

/**
 * The other two routes, so every audience page offers both alternatives
 * rather than only one.
 */
const OTHERS: Record<Audience["kind"], { href: string; label: string }[]> = {
  buyer: [
    { href: "/for-farmers", label: "I am a farmer instead" },
    { href: "/for-shoppers", label: "I am buying for myself" },
  ],
  supplier: [
    { href: "/for-retailers", label: "I am a retailer instead" },
    { href: "/for-shoppers", label: "I am buying for myself" },
  ],
  shopper: [
    { href: "/for-retailers", label: "I am a retailer instead" },
    { href: "/for-farmers", label: "I am a farmer instead" },
  ],
};

/**
 * Sets the last two words of a heading in gold, the way the logo splits
 * AfriLynq. Keeps the two-colour treatment consistent without hand marking up
 * every string in the content file.
 */
function TwoTone({ text }: { text: string }) {
  const words = text.split(" ");
  if (words.length < 3) return <>{text}</>;
  const head = words.slice(0, -2).join(" ");
  const tail = words.slice(-2).join(" ");
  return (
    <>
      {head} <span className="text-gold">{tail}</span>
    </>
  );
}

/**
 * Shared landing page for the two audiences.
 *
 * The client's brief: someone arrives, reads the story, and only then meets a
 * button that takes them to the form. So the page argues its case first and
 * puts the action at the end of each section rather than fighting the reader
 * for attention at the top.
 */
export interface Audience {
  kind: "buyer" | "supplier" | "shopper";
  eyebrow: string;
  title: string;
  lede: string;
  photo: string;
  cta: string;
  href: string;
  story: { heading: string; body: string[] };
  steps: { n: string; title: string; body: string }[];
  gains: { title: string; body: string }[];
  faqs: { q: string; a: string }[];
}

export default function AudienceLanding({ a }: { a: Audience }) {
  const hero = sitePhoto(a.photo);

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-forest-deep">
        {hero ? (
          /* The wrapper carries the positioning. Photo hardcodes `relative` on
             its own box and Tailwind emits `relative` after `absolute`, so
             passing `absolute inset-0` straight in collapses it to zero height. */
          <div className="absolute inset-0">
            <Photo
              src={hero}
              alt=""
              label=""
              className="h-full w-full"
              sizes="100vw"
              priority
            />
          </div>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url(/backdrop.svg)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-hidden="true"
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-r from-forest-deep via-forest-deep/88 to-forest-deep/35"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:py-24">
          <span className="inline-block rounded-full bg-forest-deep/70 px-4 py-1.5 text-sm text-gold ring-1 ring-gold/30">
            {a.eyebrow}
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl leading-[1.08] !text-paper sm:text-5xl lg:text-6xl">
            {a.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-sand">{a.lede}</p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link href={a.href} className="btn-gold">
              {a.cta}
            </Link>
            <a
              href="#how"
              className="inline-block rounded border border-sand-deep/50 px-6 py-3 text-paper transition-colors hover:bg-paper hover:text-forest"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="band-veil border-b border-sand-deep">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-3xl sm:text-4xl">
            <TwoTone text={a.story.heading} />
          </h2>
          <div className="mt-6 space-y-5 text-lg leading-relaxed text-ink-soft">
            {a.story.body.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section id="how" className="band-veil scroll-mt-24 border-y border-sand-deep">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="text-3xl sm:text-4xl">
            How it <span className="text-gold">works</span>
          </h2>

          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {a.steps.map((s, i) => {
              const shot = sitePhoto(STEP_PHOTOS[i % STEP_PHOTOS.length]);
              return (
                <li
                  key={s.n}
                  className="relative isolate flex min-h-[18rem] flex-col justify-end overflow-hidden rounded-xl bg-forest-deep p-6"
                >
                  {shot ? (
                    <Image
                      src={shot}
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
                    className="absolute inset-0 bg-gradient-to-t from-forest-deep via-forest-deep/72 to-transparent"
                    aria-hidden="true"
                  />
                  <span className="absolute left-6 top-6 flex h-11 w-11 items-center justify-center rounded-lg bg-gold font-semibold text-forest-deep">
                    {s.n}
                  </span>
                  <div className="relative">
                    <h3 className="text-lg !text-paper">{s.title}</h3>
                    <p className="mt-2 leading-relaxed text-sand">{s.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-10">
            <Link href={a.href} className="btn-primary">
              {a.cta}
            </Link>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-3xl sm:text-4xl">
          What you <span className="text-gold">get</span>
        </h2>
        <div className="mt-11 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {a.gains.map((g, i) => {
            const shot = sitePhoto(GAIN_PHOTOS[a.kind][i % 6]);
            return (
              <article
                key={g.title}
                className="overflow-hidden rounded-xl bg-paper/90 shadow-sm ring-1 ring-sand-deep"
              >
                <div className="relative isolate">
                  <Photo
                    src={shot}
                    alt=""
                    label={g.title}
                    className="aspect-[16/10] w-full"
                    sizes="(min-width: 1024px) 380px, 100vw"
                  />
                  <span className="absolute -bottom-7 left-6">
                    <HeadingIcon name={GAIN_ICONS[i % 6]} size="sm" />
                  </span>
                </div>
                <div className="px-6 pt-11 pb-7">
                  <h3 className="text-lg font-bold">{g.title}</h3>
                  <p className="mt-2.5 leading-relaxed text-ink-soft">{g.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Through to the catalogue. The full grid lives on the home page; a
          second copy here was duplication, but the route still has to exist. */}
      <section className="band-veil border-t border-sand-deep">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <p className="max-w-xl text-lg leading-relaxed text-ink-soft">
              {a.kind === "buyer"
                ? "Every product we source, with its season, trading unit and what a supplier will ask you to specify."
                : "See what buyers are asking for, and where your produce fits."}
            </p>
            <Link href="/categories" className="btn-primary">
              Browse the catalogue
            </Link>
          </div>
        </div>
      </section>

      {/* Questions */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-3xl sm:text-4xl">
          Questions people <span className="text-gold">ask</span>
        </h2>
        <dl className="mt-9 space-y-7">
          {a.faqs.map((f) => (
            <div key={f.q} className="rule-top pt-5">
              <dt className="text-lg font-medium text-forest">{f.q}</dt>
              <dd className="mt-2 leading-relaxed text-ink-soft">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Close */}
      <section className="band-scene text-paper">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-3xl !text-paper sm:text-4xl">
            Ready to <span className="text-gold">start?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-sand-deep">
            Registration is free and takes a couple of minutes. You will hear from a
            person, not an automated reply.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href={a.href} className="btn-gold">
              {a.cta}
            </Link>
            {OTHERS[a.kind].map((o) => (
              <Link
                key={o.href}
                href={o.href}
                className="inline-block rounded border border-sand-deep/50 px-6 py-3 text-paper transition-colors hover:bg-paper hover:text-forest"
              >
                {o.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
