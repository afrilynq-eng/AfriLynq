import Link from "next/link";
import { CATEGORIES } from "@/lib/content";
import { categoryPhoto, sitePhoto } from "@/lib/photos";
import { Photo } from "@/components/Photo";

/**
 * Shared landing page for the two audiences.
 *
 * The client's brief: someone arrives, reads the story, and only then meets a
 * button that takes them to the form. So the page argues its case first and
 * puts the action at the end of each section rather than fighting the reader
 * for attention at the top.
 */
export interface Audience {
  kind: "buyer" | "supplier";
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
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "repeating-linear-gradient(115deg, transparent 0 22px, rgba(208,141,29,0.4) 22px 24px)",
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
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-3xl sm:text-4xl">{a.story.heading}</h2>
        <div className="mt-6 space-y-5 text-lg leading-relaxed text-ink-soft">
          {a.story.body.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section id="how" className="scroll-mt-24 border-y border-sand-deep bg-sand">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="text-3xl sm:text-4xl">How it works</h2>

          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {a.steps.map((s) => (
              <li key={s.n} className="rounded-xl bg-paper p-6 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold font-semibold text-forest-deep">
                  {s.n}
                </span>
                <h3 className="mt-4 text-lg">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{s.body}</p>
              </li>
            ))}
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
        <h2 className="text-3xl sm:text-4xl">What you get</h2>
        <div className="mt-9 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {a.gains.map((g) => (
            <div key={g.title} className="rule-top pt-5">
              <h3 className="text-lg">{g.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{g.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="border-t border-sand-deep bg-sand">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl sm:text-4xl">
              {a.kind === "buyer" ? "What you can source" : "What we list"}
            </h2>
            <Link href="/categories" className="link-quiet text-ink-soft">
              All categories &rarr;
            </Link>
          </div>

          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.slice(0, 4).map((c) => (
              <Link
                key={c.slug}
                href={`/categories/${c.slug}`}
                className="overflow-hidden rounded-xl bg-paper shadow-sm transition-shadow hover:shadow-md"
              >
                <Photo
                  src={categoryPhoto(c.slug)}
                  alt={c.name}
                  label={c.name}
                  className="aspect-[4/3] w-full"
                  sizes="(min-width: 1024px) 280px, 100vw"
                />
                <div className="p-5">
                  <h3 className="text-lg">{c.name}</h3>
                  <p className="mt-1.5 text-sm text-ink-soft">
                    {c.products.length} products
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Questions */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-3xl sm:text-4xl">Questions people ask</h2>
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
      <section className="bg-forest-deep text-paper">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-3xl !text-paper sm:text-4xl">Ready to start?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-sand-deep">
            Registration is free and takes a couple of minutes. You will hear from a
            person, not an automated reply.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href={a.href} className="btn-gold">
              {a.cta}
            </Link>
            <Link
              href={a.kind === "buyer" ? "/for-farmers" : "/for-retailers"}
              className="inline-block rounded border border-sand-deep/50 px-6 py-3 text-paper transition-colors hover:bg-paper hover:text-forest"
            >
              {a.kind === "buyer" ? "I am a farmer instead" : "I am a retailer instead"}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
