import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { publicSupplier, catalogueLabels } from "@/lib/catalogue";
import { COUNTRIES } from "@/lib/countries";
import { currentUser } from "@/lib/supabase-server";
import ListingCard from "@/components/catalogue/ListingCard";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  supplier: "Supplier",
  buyer: "Buyer",
  both: "Supplier and buyer",
};

const BAND_LABEL: Record<string, string> = {
  "1-9": "1 to 9 people",
  "10-49": "10 to 49 people",
  "50-199": "50 to 199 people",
  "200-499": "200 to 499 people",
  "500+": "500 or more people",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  // Metadata is public, so it is generated without contact details.
  const company = await publicSupplier(slug, { includeContact: false });
  if (!company) return { title: "Supplier not found" };

  return {
    title: company.name,
    description:
      company.shortDescription ??
      `${company.name}, a verified supplier on AfriLynq.`,
    alternates: { canonical: `/suppliers/${slug}` },
  };
}

export default async function SupplierPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Whether contact details are even fetched depends on who is asking.
  // Fetching them and then hiding them in the markup would put a phone
  // number into the page source for anyone who looked.
  const user = await currentUser();
  const [company, labels] = await Promise.all([
    publicSupplier(slug, { includeContact: Boolean(user) }),
    catalogueLabels(),
  ]);

  if (!company) notFound();

  const categoryName = new Map(labels.categories.map((c) => [c.id, c.name]));
  const unitName = new Map(labels.units.map((u) => [u.code, u.name.toLowerCase()]));
  const countryName = new Map(COUNTRIES.map((c) => [c.code, c.name]));

  const where = [
    company.city,
    company.region,
    company.countryCode ? (countryName.get(company.countryCode) ?? company.countryCode) : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <section className="border-b border-sand-deep bg-sand">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-sm">
            <Link href="/suppliers" className="link-quiet text-ink-soft">
              Verified suppliers
            </Link>
          </p>

          <div className="mt-5 flex flex-wrap items-start gap-5">
            {company.logoUrl ? (
              <Image
                src={company.logoUrl}
                alt=""
                width={80}
                height={80}
                unoptimized
                className="h-20 w-20 shrink-0 rounded-xl border border-sand-deep bg-paper object-contain p-1.5"
              />
            ) : (
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-forest text-3xl font-semibold text-paper">
                {company.name.charAt(0).toUpperCase()}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl sm:text-4xl">{company.name}</h1>
                <span className="rounded-full bg-forest/10 px-3 py-1 text-[0.68rem] font-semibold tracking-wide text-forest uppercase">
                  Verified
                </span>
              </div>

              {company.name !== company.legalName && (
                <p className="mt-1 text-sm text-stone">
                  Registered as {company.legalName}
                </p>
              )}

              <p className="mt-2 text-ink-soft">
                {[
                  TYPE_LABEL[company.companyType] ?? company.companyType,
                  where,
                  company.yearEstablished ? `since ${company.yearEstablished}` : null,
                  company.employeeBand ? BAND_LABEL[company.employeeBand] : null,
                ]
                  .filter(Boolean)
                  .join(" . ")}
              </p>

              {company.shortDescription && (
                <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
                  {company.shortDescription}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl gap-10 px-6 py-12 lg:flex">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl">
            {company.listings.length === 0
              ? "Listings"
              : `${company.listings.length} listing${company.listings.length === 1 ? "" : "s"}`}
          </h2>

          {company.listings.length === 0 ? (
            <p className="mt-4 max-w-xl leading-relaxed text-ink-soft">
              This company has been verified but has not published anything
              yet. Get in touch if you are looking for something they might
              supply.
            </p>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {company.listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  categoryName={categoryName.get(listing.categoryId) ?? null}
                  unitName={unitName.get(listing.unitCode) ?? listing.unitCode}
                  countryName={
                    listing.originCountryCode
                      ? (countryName.get(listing.originCountryCode) ?? null)
                      : null
                  }
                />
              ))}
            </div>
          )}

          {company.about && (
            <section className="mt-12 max-w-3xl">
              <h2 className="text-2xl">About {company.name}</h2>
              <div className="mt-4 leading-relaxed whitespace-pre-line text-ink-soft">
                {company.about}
              </div>
            </section>
          )}
        </div>

        {/* ---------- Contact ---------- */}
        <aside className="mt-10 shrink-0 lg:mt-0 lg:w-80">
          <div className="rounded-xl border border-sand-deep bg-paper p-6 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-xl">Get in touch</h2>

            {company.contact ? (
              <>
                <dl className="mt-4 space-y-3 text-sm">
                  {company.contact.email && (
                    <div>
                      <dt className="text-[0.68rem] font-semibold tracking-widest text-stone uppercase">
                        Email
                      </dt>
                      <dd className="mt-1 break-all">
                        <a
                          href={`mailto:${company.contact.email}`}
                          className="link-quiet text-forest"
                        >
                          {company.contact.email}
                        </a>
                      </dd>
                    </div>
                  )}
                  {company.contact.phone && (
                    <div>
                      <dt className="text-[0.68rem] font-semibold tracking-widest text-stone uppercase">
                        Phone
                      </dt>
                      <dd className="mt-1">
                        <a
                          href={`tel:${company.contact.phone.replace(/\s+/g, "")}`}
                          className="link-quiet text-forest"
                        >
                          {company.contact.phone}
                        </a>
                      </dd>
                    </div>
                  )}
                  {company.websiteUrl && (
                    <div>
                      <dt className="text-[0.68rem] font-semibold tracking-widest text-stone uppercase">
                        Website
                      </dt>
                      <dd className="mt-1 break-all">
                        <a
                          href={company.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="link-quiet text-forest"
                        >
                          {company.websiteUrl.replace(/^https?:\/\//, "")}
                        </a>
                      </dd>
                    </div>
                  )}
                  {!company.contact.email &&
                    !company.contact.phone &&
                    !company.websiteUrl && (
                      <p className="text-ink-soft">
                        This supplier has not added contact details yet.
                      </p>
                    )}
                </dl>

                <p className="mt-5 text-xs leading-relaxed text-stone">
                  Say who you are and what quantity you need. Suppliers answer
                  specific enquiries and ignore vague ones.
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  Contact details are shown to registered buyers. It takes a
                  minute and it is free.
                </p>
                <Link href="/sign-up" className="btn-lift btn-primary mt-5 block text-center">
                  Create an account
                </Link>
                <p className="mt-3 text-center text-sm text-ink-soft">
                  Already registered?{" "}
                  <Link href="/sign-in" className="link-quiet text-forest">
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
