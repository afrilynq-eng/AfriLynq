import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { publicSuppliers } from "@/lib/catalogue";
import { COUNTRIES } from "@/lib/countries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verified suppliers",
  description:
    "African producers, co-operatives, processors and exporters whose registration and certificates AfriLynq has checked.",
  alternates: { canonical: "/suppliers" },
};

const TYPE_LABEL: Record<string, string> = {
  supplier: "Supplier",
  buyer: "Buyer",
  both: "Supplier and buyer",
};

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string }>;
}) {
  const { q, country } = await searchParams;

  const suppliers = await publicSuppliers({ q, country });
  const countryName = new Map(COUNTRIES.map((c) => [c.code, c.name]));

  const available = [
    ...new Set(suppliers.map((s) => s.countryCode).filter(Boolean)),
  ] as string[];

  const filtered = Boolean(q || country);

  return (
    <>
      <section className="border-b border-sand-deep bg-sand">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h1 className="text-4xl sm:text-5xl">Verified suppliers</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Every company on this page has supplied its registration and
            certificates, and we have checked them. A supplier appears here
            only after that, and comes off it if the position changes.
          </p>

          <form className="mt-8 flex flex-wrap gap-3" action="/suppliers">
            <label htmlFor="q" className="sr-only">
              Search suppliers
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q ?? ""}
              placeholder="Company name or what they supply"
              className="min-w-[14rem] flex-1 rounded-lg border border-sand-deep bg-paper px-4 py-3 text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30"
            />

            {available.length > 1 && (
              <select
                name="country"
                defaultValue={country ?? ""}
                aria-label="Country"
                className="rounded-lg border border-sand-deep bg-paper px-4 py-3 text-ink outline-none focus:border-gold"
              >
                <option value="">All countries</option>
                {available.map((code) => (
                  <option key={code} value={code}>
                    {countryName.get(code) ?? code}
                  </option>
                ))}
              </select>
            )}

            <button type="submit" className="btn-lift btn-primary">
              Search
            </button>

            {filtered && (
              <Link href="/suppliers" className="btn-lift btn-ghost">
                Clear
              </Link>
            )}
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        {suppliers.length === 0 ? (
          <div className="rounded-xl border border-sand-deep bg-paper p-10 text-center">
            <h2 className="text-2xl">
              {filtered ? "Nothing matches that" : "No verified suppliers yet"}
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-relaxed text-ink-soft">
              {filtered
                ? "Try a broader search, or clear the filters."
                : "Companies are being verified now. Each one appears here once its documents have been checked."}
            </p>
            <div className="mt-8">
              <Link
                href={filtered ? "/suppliers" : "/register/farmer"}
                className="btn-lift btn-primary"
              >
                {filtered ? "See everyone" : "Apply to be listed"}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-ink-soft">
              {suppliers.length} verified compan
              {suppliers.length === 1 ? "y" : "ies"}
            </p>

            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {suppliers.map((s) => (
                <article
                  key={s.id}
                  className="rounded-xl border border-sand-deep bg-paper p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    {s.logoUrl ? (
                      <Image
                        src={s.logoUrl}
                        alt=""
                        width={48}
                        height={48}
                        unoptimized
                        className="h-12 w-12 shrink-0 rounded-lg object-contain"
                      />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-forest text-lg font-semibold text-paper">
                        {s.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <h3 className="leading-snug">
                        {s.slug ? (
                          <Link
                            href={`/suppliers/${s.slug}`}
                            className="text-ink transition-colors hover:text-forest"
                          >
                            {s.name}
                          </Link>
                        ) : (
                          s.name
                        )}
                      </h3>
                      <p className="mt-0.5 text-sm text-stone">
                        {[
                          TYPE_LABEL[s.companyType] ?? s.companyType,
                          s.city,
                          s.countryCode
                            ? (countryName.get(s.countryCode) ?? s.countryCode)
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" . ")}
                      </p>
                    </div>
                  </div>

                  {s.shortDescription && (
                    <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-ink-soft">
                      {s.shortDescription}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-sand pt-3.5 text-sm">
                    <span className="text-ink-soft">
                      {s.listingCount === 0
                        ? "No listings yet"
                        : `${s.listingCount} listing${s.listingCount === 1 ? "" : "s"}`}
                    </span>
                    <span className="rounded-full bg-forest/10 px-2.5 py-1 text-[0.68rem] font-semibold tracking-wide text-forest uppercase">
                      Verified
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
