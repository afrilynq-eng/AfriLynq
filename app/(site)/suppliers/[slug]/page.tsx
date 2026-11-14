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
  const company = await publicSupplier(slug);
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

  // Contact details are not fetched at all, for anybody. Signing in no
  // longer reveals them: it only decides whether this page offers the
  // enquiry route or the sign-up one.
  const user = await currentUser();
  const signedIn = Boolean(user);
  const [company, labels] = await Promise.all([
    publicSupplier(slug),
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

  // The four checks, in the same words and the same order the home page
  // and the retailers page promise them. Only the ones actually recorded
  // are shown: a company verified before we began recording has nothing
  // to say here, and silence is better than four empty rows.
  const CHECK_LABELS: [keyof NonNullable<typeof company.checks>, string][] = [
    ["registration", "Business registration in the country of origin"],
    ["exports", "Evidence of previous export shipments"],
    ["certificates", "Certificates on file, expiry dates checked"],
    ["contact", "One named, accountable contact"],
  ];
  const checkRows = CHECK_LABELS.flatMap(([key, label]) => {
    const state = company.checks?.[key];
    return state ? [{ label, state }] : [];
  });

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
          <h2 id="listings" className="scroll-mt-24 text-2xl">
            {company.listings.length === 0
              ? "Listings"
              : `${company.listings.length} listing${company.listings.length === 1 ? "" : "s"}`}
          </h2>

          {company.listings.length === 0 ? (
            <p className="mt-4 max-w-xl leading-relaxed text-ink-soft">
              This company has been verified but has not published anything
              yet. There is nothing to enquire about until they do.
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
          {/* What was actually checked.
              The home page and the retailers page promise buyers these
              four by name. Until the admin screens started recording
              them there was nothing to show, so the promise sat
              unevidenced. Omitted entirely for companies verified before
              we began recording, because four blank rows would read as
              four failures. */}
          {checkRows.length > 0 && (
            <div className="mb-6 rounded-xl border border-sand-deep bg-sand/50 p-6">
              <h2 className="text-xs font-semibold tracking-widest text-forest uppercase">
                What we checked
              </h2>
              <ul className="mt-4 space-y-3">
                {checkRows.map((row) => (
                  <li key={row.label} className="flex items-start gap-2.5 text-sm">
                    {row.state === "pass" ? (
                      <svg
                        viewBox="0 0 16 16"
                        className="mt-0.5 h-4 w-4 shrink-0 text-forest"
                        fill="none"
                        aria-hidden="true"
                      >
                        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
                        <path
                          d="M4.8 8.3 7 10.5l4.2-4.6"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 16 16"
                        className="mt-0.5 h-4 w-4 shrink-0 text-stone"
                        fill="none"
                        aria-hidden="true"
                      >
                        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
                        <path d="M5 8h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    )}
                    <span className={row.state === "pass" ? "text-ink" : "text-stone"}>
                      {row.label}
                      {row.state === "na" && (
                        <span className="block text-xs text-stone">Not applicable</span>
                      )}
                      {row.state === "fail" && (
                        <span className="block text-xs text-stone">Not passed</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-sand pt-3 text-xs leading-relaxed text-stone">
                Checked by AfriLynq before this supplier was listed. AfriLynq
                introduces buyers and suppliers and is not a party to any sale.
              </p>
            </div>
          )}

          {/* No email, no phone, for anyone. A buyer who can read the phone
              number has no reason to raise an enquiry, and AfriLynq earns
              nothing on a trade it never saw. Contact details are exchanged
              once an order is confirmed, which is when the two of them
              actually need to reach each other. */}
          <div className="rounded-xl border border-sand-deep bg-paper p-6 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-xl">Contact this supplier</h2>

            {signedIn ? (
              <>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {company.listingCount > 0
                    ? "Open a listing and send an enquiry. They reply with a quotation, and everything said about it stays in one conversation."
                    : "They have not published a listing yet. Nothing can be enquired about until they do."}
                </p>

                {company.listingCount > 0 && (
                  <a href="#listings" className="btn-lift btn-primary mt-5 block text-center">
                    See their listings
                  </a>
                )}

                <Link
                  href="/account/messages"
                  className="link-quiet mt-4 block text-center text-sm text-forest"
                >
                  My conversations
                </Link>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  Enquiries, quotations and delivery all run through your
                  AfriLynq account. It takes a minute and it is free.
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

            {company.websiteUrl && (
              <p className="mt-5 border-t border-sand pt-4 text-sm break-all">
                <span className="block text-[0.68rem] font-semibold tracking-widest text-stone uppercase">
                  Website
                </span>
                <a
                  href={company.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="link-quiet mt-1 inline-block text-forest"
                >
                  {company.websiteUrl.replace(/^https?:\/\//, "")}
                </a>
              </p>
            )}

            <p className="mt-5 border-t border-sand pt-4 text-xs leading-relaxed text-stone">
              Email and phone numbers are exchanged once an order is
              confirmed. Until then the whole conversation stays on AfriLynq,
              so there is one record of what was agreed.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
