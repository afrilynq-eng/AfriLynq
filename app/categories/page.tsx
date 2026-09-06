import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, MONTHS, categoryCalendar } from "@/lib/content";
import { Harvest, HarvestKey } from "@/components/Harvest";
import { Photo } from "@/components/Photo";
import { categoryPhoto } from "@/lib/photos";

export const metadata: Metadata = {
  title: "What we source",
  description:
    "The agricultural categories AfriLynq sources from Africa into the United Kingdom, with the harvest window, trading unit and typical minimum order for each.",
  alternates: { canonical: "/categories" },
};

export default function CategoriesPage() {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Agricultural categories sourced by AfriLynq",
    itemListElement: CATEGORIES.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      description: c.summary,
      url: `/categories/${c.slug}`,
    })),
  };

  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-10">
        <h1 className="max-w-3xl text-4xl sm:text-5xl">What we source</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Seven categories, each with its own season, its own trading unit and its own
          documentation. Open one to see the products inside it, when they ship, and
          what a supplier will ask you to specify.
        </p>
        <div className="mt-8">
          <HarvestKey />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="border-t border-sand-deep">
          {CATEGORIES.map((category) => (
            <article
              key={category.slug}
              className="grid gap-6 border-b border-sand-deep py-9 lg:grid-cols-12"
            >
              <div className="lg:col-span-4">
                <Link href={`/categories/${category.slug}`} className="block">
                  <Photo
                    src={categoryPhoto(category.slug)}
                    alt={category.name}
                    label={category.name}
                    className="aspect-[3/2] w-full rounded"
                    sizes="(min-width: 1024px) 340px, 100vw"
                  />
                </Link>
              </div>

              <div className="lg:col-span-4">
                <h2 className="text-2xl">
                  <Link href={`/categories/${category.slug}`} className="link-quiet">
                    {category.name}
                  </Link>
                </h2>
                <p className="mt-3 max-w-md leading-relaxed text-ink-soft">
                  {category.summary}
                </p>
                <p className="mt-3 text-sm text-stone">
                  {category.products.length} products listed
                </p>
              </div>

              <div className="lg:col-span-4">
                <Harvest
                  calendar={categoryCalendar(category)}
                  showScale
                  label={category.name}
                />
                <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-soft">
                  {category.products.map((p) => (
                    <li key={p.name}>{p.name}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <p className="max-w-2xl leading-relaxed text-ink-soft">
          Looking for something not listed here? The categories above are where we are
          opening, not the limit of what we can reach. Tell us what you need and we
          will say honestly whether we can source it.
        </p>
        <Link
          href="/contact#buy"
          className="btn-primary mt-6"
        >
          Ask about a product
        </Link>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
    </>
  );
}
