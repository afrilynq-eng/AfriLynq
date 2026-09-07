import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, categoryCalendar, getCategory } from "@/lib/content";
import { Harvest, HarvestKey } from "@/components/Harvest";
import LeadForm from "@/components/LeadForm";
import { Photo } from "@/components/Photo";
import { categoryPhoto, productPhoto } from "@/lib/photos";

/**
 * Every category page is generated at build time. These pages are the
 * acquisition channel, so they are static HTML with the content in the markup.
 */
export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};

  return {
    title: `${category.name}: sourcing from Africa`,
    description: `${category.summary} Harvest windows, trading units and minimum order quantities for buyers importing into the United Kingdom.`,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: {
      title: `${category.name} from Africa | AfriLynq`,
      description: category.summary,
      url: `/categories/${category.slug}`,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const others = CATEGORIES.filter((c) => c.slug !== category.slug);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "/" },
      { "@type": "ListItem", position: 2, name: "What we source", item: "/categories" },
      { "@type": "ListItem", position: 3, name: category.name },
    ],
  };

  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-10">
        <nav aria-label="Breadcrumb" className="text-sm text-stone">
          <Link href="/categories" className="link-quiet">
            What we source
          </Link>
          <span className="px-2">/</span>
          <span className="text-ink-soft">{category.name}</span>
        </nav>
      </section>

      <section className="mx-auto max-w-6xl px-6 pt-8 pb-12">
        <h1 className="max-w-3xl text-4xl sm:text-5xl">{category.name}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
          {category.intro}
        </p>

        <div className="mt-10">
          <Photo
            src={categoryPhoto(category.slug)}
            alt={category.name}
            label={category.name}
            className="aspect-[21/9] w-full rounded"
            sizes="(min-width: 1280px) 1152px, 100vw"
            priority
          />
        </div>

        <div className="mt-10 max-w-2xl">
          <Harvest
            calendar={categoryCalendar(category)}
            showScale
            label={category.name}
          />
          <div className="mt-5">
            <HarvestKey />
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="border-t border-sand-deep">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-2xl sm:text-3xl">Products in this category</h2>

          <div className="mt-9 border-t border-sand-deep">
            {category.products.map((product) => (
              <article
                key={product.name}
                className="grid gap-6 border-b border-sand-deep py-8 lg:grid-cols-12"
              >
                <div className="lg:col-span-3">
                  <Photo
                    src={productPhoto(product.slug)}
                    alt={product.name}
                    label={product.name}
                    className="aspect-[4/3] w-full rounded"
                    sizes="(min-width: 1024px) 260px, 100vw"
                  />
                </div>

                <div className="lg:col-span-4">
                  <h3 className="text-xl">{product.name}</h3>
                  <p className="mt-1.5 text-sm text-stone">
                    {product.origins.join(", ")}
                  </p>
                  <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
                    {product.note}
                  </p>
                </div>

                <div className="lg:col-span-3">
                  <Harvest calendar={product.calendar} showScale label={product.name} />
                </div>

                <dl className="space-y-3 text-sm lg:col-span-3">
                  <div>
                    <dt className="text-stone">Traded in</dt>
                    <dd className="mt-0.5 text-ink">{product.unit}</dd>
                  </div>
                  <div>
                    <dt className="text-stone">Typical minimum order</dt>
                    <dd className="mt-0.5 text-ink">{product.minimumOrder}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* What to specify */}
      <section className="border-t border-sand-deep bg-sand">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl sm:text-3xl">What to specify when you enquire</h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
              A supplier can only price what you have described. The more of this you
              put in the first message, the faster a usable quotation comes back.
            </p>
          </div>
          <ul className="space-y-3">
            {category.specify.map((item) => (
              <li
                key={item}
                className="border-l-2 border-gold pl-5 leading-relaxed text-ink-soft"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Enquiry */}
      <section className="border-t border-sand-deep">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <LeadForm kind="buyer" defaultCategory={category.slug} />
        </div>
      </section>

      {/* Other categories */}
      <section className="border-t border-sand-deep">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-lg">Other categories</h2>
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
            {others.map((c) => (
              <li key={c.slug}>
                <Link href={`/categories/${c.slug}`} className="link-quiet text-ink-soft">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </>
  );
}
