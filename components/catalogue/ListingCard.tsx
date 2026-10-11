import Link from "next/link";
import Image from "next/image";
import type { CatalogueListing } from "@/lib/catalogue";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** 1,2,3,11,12 reads better as "Nov to Mar" than as a list of five months. */
function season(months: number[] | null): string | null {
  if (!months || months.length === 0) return null;
  if (months.length === 12) return "All year";

  const sorted = [...months].sort((a, b) => a - b);
  const runs: number[][] = [];
  for (const m of sorted) {
    const last = runs[runs.length - 1];
    if (last && m === last[last.length - 1] + 1) last.push(m);
    else runs.push([m]);
  }

  // A run ending in December and one starting in January are one season.
  if (runs.length > 1) {
    const first = runs[0];
    const last = runs[runs.length - 1];
    if (first[0] === 1 && last[last.length - 1] === 12) {
      runs[runs.length - 1] = [...last, ...first];
      runs.shift();
    }
  }

  return runs
    .map((run) =>
      run.length === 1
        ? MONTHS[run[0] - 1]
        : `${MONTHS[run[0] - 1]} to ${MONTHS[run[run.length - 1] - 1]}`
    )
    .join(", ");
}

export function priceLabel(price: CatalogueListing["price"], unit: string) {
  if (!price) return "Price on enquiry";
  const fmt = (n: number) =>
    n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (price.min !== null && price.max !== null && price.max !== price.min) {
    return `${price.currency} ${fmt(price.min)} to ${fmt(price.max)} per ${unit}`;
  }
  const only = price.min ?? price.max;
  if (only === null) return "Price on enquiry";
  return `${price.currency} ${fmt(only)} per ${unit}`;
}

export default function ListingCard({
  listing,
  categoryName,
  unitName,
  countryName,
}: {
  listing: CatalogueListing;
  categoryName: string | null;
  unitName: string;
  countryName: string | null;
}) {
  const where = [listing.originRegion, countryName].filter(Boolean).join(", ");
  const when = season(listing.harvestMonths);

  return (
    <article className="group overflow-hidden rounded-xl border border-sand-deep bg-paper shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/marketplace/${listing.slug}`} className="block">
        <span className="block aspect-[4/3] overflow-hidden bg-sand">
          {listing.imageUrl ? (
            <Image
              src={listing.imageUrl}
              alt=""
              width={600}
              height={450}
              unoptimized
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm text-stone">
              No photograph
            </span>
          )}
        </span>
      </Link>

      <div className="p-5">
        {categoryName && (
          <p className="text-[0.68rem] font-semibold tracking-widest text-stone uppercase">
            {categoryName}
          </p>
        )}

        <h3 className="mt-1.5 text-lg leading-snug">
          <Link
            href={`/marketplace/${listing.slug}`}
            className="text-ink transition-colors hover:text-forest"
          >
            {listing.name}
          </Link>
        </h3>

        {listing.summary && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
            {listing.summary}
          </p>
        )}

        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="shrink-0 text-stone">Price</dt>
            <dd className="text-ink">{priceLabel(listing.price, unitName)}</dd>
          </div>
          {listing.minOrderQuantity !== null && (
            <div className="flex gap-2">
              <dt className="shrink-0 text-stone">Minimum</dt>
              <dd className="text-ink-soft">
                {listing.minOrderQuantity} {unitName}
              </dd>
            </div>
          )}
          {where && (
            <div className="flex gap-2">
              <dt className="shrink-0 text-stone">Origin</dt>
              <dd className="text-ink-soft">{where}</dd>
            </div>
          )}
          {when && (
            <div className="flex gap-2">
              <dt className="shrink-0 text-stone">Season</dt>
              <dd className="text-ink-soft">{when}</dd>
            </div>
          )}
        </dl>

        <div className="mt-4 flex items-center gap-2.5 border-t border-sand pt-3.5">
          {listing.company.logoUrl ? (
            <Image
              src={listing.company.logoUrl}
              alt=""
              width={28}
              height={28}
              unoptimized
              className="h-7 w-7 shrink-0 rounded object-contain"
            />
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-forest text-xs font-semibold text-paper">
              {listing.company.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="min-w-0 text-sm">
            {listing.company.slug ? (
              <Link
                href={`/suppliers/${listing.company.slug}`}
                className="link-quiet block truncate text-ink-soft"
              >
                {listing.company.name}
              </Link>
            ) : (
              <span className="block truncate text-ink-soft">
                {listing.company.name}
              </span>
            )}
          </span>
          <span
            title="Verified by AfriLynq"
            className="ml-auto shrink-0 rounded-full bg-forest/10 px-2.5 py-1 text-[0.68rem] font-semibold tracking-wide text-forest uppercase"
          >
            Verified
          </span>
        </div>
      </div>
    </article>
  );
}

export { season };
