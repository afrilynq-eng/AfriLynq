import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { publicListing, catalogueLabels } from "@/lib/catalogue";
import { COUNTRIES } from "@/lib/countries";
import { priceLabel, season } from "@/components/catalogue/ListingCard";
import { currentUser } from "@/lib/supabase-server";
import EnquiryForm from "@/components/catalogue/EnquiryForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await publicListing(slug);
  if (!listing) return { title: "Listing not found" };

  return {
    title: `${listing.name}, ${listing.company.name}`,
    description:
      listing.summary ??
      `${listing.name} from ${listing.company.name}, a verified supplier on AfriLynq.`,
    alternates: { canonical: `/marketplace/${listing.slug}` },
  };
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-sand py-3 last:border-0">
      <dt className="text-[0.68rem] font-semibold tracking-widest text-stone uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-ink">{value}</dd>
    </div>
  );
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [listing, labels, user] = await Promise.all([
    publicListing(slug),
    catalogueLabels(),
    currentUser(),
  ]);

  if (!listing) notFound();

  const unit =
    labels.units.find((u) => u.code === listing.unitCode)?.name.toLowerCase() ??
    listing.unitCode;
  const categoryName =
    labels.categories.find((c) => c.id === listing.categoryId)?.name ?? null;
  const countryName = listing.originCountryCode
    ? (COUNTRIES.find((c) => c.code === listing.originCountryCode)?.name ??
      listing.originCountryCode)
    : null;

  const where = [listing.originRegion, countryName].filter(Boolean).join(", ");
  const when = season(listing.harvestMonths);

  return (
    <article className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm text-ink-soft">
        <Link href="/marketplace" className="link-quiet">
          Marketplace
        </Link>
        {categoryName && (
          <>
            {" / "}
            <span className="text-stone">{categoryName}</span>
          </>
        )}
      </p>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        {/* ---------- Photographs ---------- */}
        <div>
          {listing.images.length > 0 ? (
            <>
              <span className="block overflow-hidden rounded-xl border border-sand-deep bg-sand">
                <Image
                  src={listing.images[0]}
                  alt={listing.name}
                  width={900}
                  height={675}
                  unoptimized
                  priority
                  className="aspect-[4/3] w-full object-cover"
                />
              </span>
              {listing.images.length > 1 && (
                <div className="mt-3 grid grid-cols-4 gap-3">
                  {listing.images.slice(1, 5).map((src) => (
                    <span
                      key={src}
                      className="block overflow-hidden rounded-lg border border-sand-deep bg-sand"
                    >
                      <Image
                        src={src}
                        alt=""
                        width={220}
                        height={220}
                        unoptimized
                        className="aspect-square w-full object-cover"
                      />
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <span className="flex aspect-[4/3] items-center justify-center rounded-xl border border-sand-deep bg-sand text-sm text-stone">
              No photograph supplied
            </span>
          )}
        </div>

        {/* ---------- The listing ---------- */}
        <div>
          <h1 className="text-3xl leading-tight sm:text-4xl">{listing.name}</h1>

          {listing.summary && (
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">
              {listing.summary}
            </p>
          )}

          <p className="mt-6 text-2xl text-forest">
            {priceLabel(listing.price, unit)}
          </p>

          <dl className="mt-6">
            {listing.minOrderQuantity !== null && (
              <Fact
                label="Minimum order"
                value={`${listing.minOrderQuantity} ${unit}`}
              />
            )}
            {listing.maxMonthlyCapacity !== null && (
              <Fact
                label="Monthly capacity"
                value={`${listing.maxMonthlyCapacity} ${unit}`}
              />
            )}
            {listing.leadTimeDays !== null && (
              <Fact label="Lead time" value={`${listing.leadTimeDays} days from order`} />
            )}
            {where && <Fact label="Origin" value={where} />}
            {when && <Fact label="Harvest" value={when} />}
            {listing.packaging && <Fact label="Packaging" value={listing.packaging} />}
            {listing.shelfLifeDays !== null && (
              <Fact label="Shelf life" value={`${listing.shelfLifeDays} days`} />
            )}
            {listing.incoterms && listing.incoterms.length > 0 && (
              <Fact label="Ships on" value={listing.incoterms.join(", ")} />
            )}
          </dl>

          {/* ---------- Who supplies it ---------- */}
          <div className="mt-8 rounded-xl border border-sand-deep bg-paper p-6 shadow-sm">
            <div className="flex items-center gap-3">
              {listing.company.logoUrl ? (
                <Image
                  src={listing.company.logoUrl}
                  alt=""
                  width={44}
                  height={44}
                  unoptimized
                  className="h-11 w-11 shrink-0 rounded-lg object-contain"
                />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-forest text-lg font-semibold text-paper">
                  {listing.company.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {listing.company.name}
                </p>
                <p className="text-sm text-stone">
                  {[listing.company.city, countryName].filter(Boolean).join(", ") ||
                    "Verified supplier"}
                </p>
              </div>
              <span className="ml-auto shrink-0 rounded-full bg-forest/10 px-3 py-1 text-[0.68rem] font-semibold tracking-wide text-forest uppercase">
                Verified
              </span>
            </div>

            {/* Contact details are the reason an account exists. Published
                openly they are scraped inside a week and the supplier
                blames AfriLynq for the calls. */}
            {user ? (
              <>
                <EnquiryForm
                  productId={listing.id}
                  productName={listing.name}
                  supplierCompanyId={listing.company.id}
                  supplierName={listing.company.name}
                  unitCode={listing.unitCode}
                  unitLabel={unit}
                />
                {listing.company.slug && (
                  <p className="mt-3 text-sm text-ink-soft">
                    Or{" "}
                    <Link
                      href={`/suppliers/${listing.company.slug}`}
                      className="link-quiet text-forest"
                    >
                      see the supplier's full profile
                    </Link>
                    .
                  </p>
                )}
              </>
            ) : (
              <div className="mt-5 rounded-lg border border-gold/40 bg-gold/8 px-4 py-3.5">
                <p className="text-sm leading-relaxed text-ink">
                  <Link href="/sign-up" className="font-semibold text-forest underline">
                    Create a free account
                  </Link>{" "}
                  to see this supplier's contact details and send an enquiry.
                  Already have one?{" "}
                  <Link href="/sign-in" className="link-quiet text-forest">
                    Sign in
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {listing.description && (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl">Specification</h2>
          <div className="mt-4 leading-relaxed whitespace-pre-line text-ink-soft">
            {listing.description}
          </div>
        </section>
      )}
    </article>
  );
}
