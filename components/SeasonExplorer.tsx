"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CATEGORIES, MONTHS } from "@/lib/content";

interface Entry {
  name: string;
  slug: string;
  categoryName: string;
  categorySlug: string;
  origins: string[];
  unit: string;
  minimumOrder: string;
  note: string;
  state: "peak" | "available" | "none";
  photo: string | null;
}

/**
 * "What can I source in March?"
 *
 * This replaces the twelve by seven grid that used to sit here. The grid held
 * the same information but asked the reader to decode it. This asks one
 * question, takes one click, and answers it with the actual products.
 *
 * Photographs and product data are passed in from the server so the lookup
 * stays on the server side and this component holds no filesystem code.
 */
export default function SeasonExplorer({
  photos,
  initialMonth,
}: {
  photos: Record<string, string | null>;
  initialMonth: number;
}) {
  const [month, setMonth] = useState(initialMonth);

  const all: Entry[] = useMemo(
    () =>
      CATEGORIES.flatMap((category) =>
        category.products.map((product) => ({
          name: product.name,
          slug: product.slug,
          categoryName: category.name,
          categorySlug: category.slug,
          origins: product.origins,
          unit: product.unit,
          minimumOrder: product.minimumOrder,
          note: product.note,
          state: product.calendar[month],
          photo: photos[product.slug] ?? null,
        }))
      ),
    [month, photos]
  );

  const peak = all.filter((e) => e.state === "peak");
  const available = all.filter((e) => e.state === "available");
  const shown = [...peak, ...available];

  return (
    <div>
      {/* Month selector. Twelve buttons, scrollable on a phone. */}
      <div className="-mx-6 overflow-x-auto px-6 pb-1">
        <div
          className="flex min-w-max gap-1.5"
          role="tablist"
          aria-label="Choose a month"
        >
          {MONTHS.map((label, i) => {
            const selected = i === month;
            const count = CATEGORIES.flatMap((c) => c.products).filter(
              (p) => p.calendar[i] !== "none"
            ).length;

            return (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setMonth(i)}
                className={[
                  "flex min-w-[4.25rem] flex-col items-center rounded px-3 py-2.5 transition-colors",
                  selected
                    ? "bg-forest text-paper"
                    : "bg-paper text-ink-soft hover:bg-sand-deep",
                ].join(" ")}
              >
                <span className="text-[0.95rem] font-medium">{label}</span>
                <span
                  className={[
                    "tabular text-xs",
                    selected ? "text-gold" : "text-stone",
                  ].join(" ")}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-6 text-lg text-ink-soft">
        <strong className="text-forest">{peak.length}</strong> products at peak in{" "}
        {MONTHS[month]}
        {available.length > 0 && (
          <>
            , and <strong className="text-forest">{available.length}</strong> more
            available
          </>
        )}
        .
      </p>

      <div className="mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((entry) => (
          <article key={entry.slug}>
            <Link href={`/categories/${entry.categorySlug}`} className="block">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded bg-forest">
                {entry.photo ? (
                  <Image
                    src={entry.photo}
                    alt={entry.name}
                    fill
                    sizes="(min-width: 1024px) 260px, 50vw"
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0 opacity-25"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(115deg, transparent 0 14px, rgba(208,141,29,0.55) 14px 15px)",
                    }}
                  />
                )}

                {entry.state === "peak" && (
                  <span className="absolute left-2 top-2 rounded bg-gold px-2 py-0.5 text-xs font-medium text-forest-deep">
                    Peak
                  </span>
                )}
              </div>

              <h3 className="mt-3 text-lg">
                <span className="link-quiet">{entry.name}</span>
              </h3>
            </Link>

            <p className="mt-1 text-sm text-stone">{entry.origins.join(", ")}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              From {entry.minimumOrder}
            </p>
          </article>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="mt-8 text-ink-soft">
          Nothing is in season in {MONTHS[month]}. Try a month either side.
        </p>
      )}
    </div>
  );
}
