"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Category, origin and search, held in the URL.
 *
 * The URL rather than component state, for three reasons: the filtered
 * view can be bookmarked and sent to somebody, the back button behaves,
 * and the filtering itself stays on the server where the rows already are.
 *
 * The search box debounces so that typing does not fire a navigation on
 * every keystroke.
 */
export default function ListingFilters({
  categories,
  origins,
}: {
  categories: { id: string; name: string }[];
  origins: { code: string; name: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");

  // Keep the box in step when the URL changes from somewhere else, such as
  // a tab click that clears the search.
  const urlQ = params.get("q") ?? "";
  useEffect(() => {
    setQ(urlQ);
  }, [urlQ]);

  function go(next: URLSearchParams) {
    const s = next.toString();
    router.replace(s ? `/account/products?${s}` : "/account/products", {
      scroll: false,
    });
  }

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    go(next);
  }

  useEffect(() => {
    if (q === urlQ) return;
    const id = setTimeout(() => set("q", q), 350);
    return () => clearTimeout(id);
    // set and params are stable enough here; re-running on q is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const control =
    "rounded-lg border border-sand-deep bg-paper px-4 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="sr-only" htmlFor="listing-category">
        Category
      </label>
      <select
        id="listing-category"
        value={params.get("cat") ?? ""}
        onChange={(e) => set("cat", e.target.value)}
        className={control}
      >
        <option value="">Category: All</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="listing-origin">
        Origin
      </label>
      <select
        id="listing-origin"
        value={params.get("origin") ?? ""}
        onChange={(e) => set("origin", e.target.value)}
        className={control}
      >
        <option value="">Origin: All</option>
        {origins.map((o) => (
          <option key={o.code} value={o.code}>
            {o.name}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="listing-search">
        Search your listings
      </label>
      <input
        id="listing-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search your listings"
        className={control + " min-w-0 flex-1"}
      />
    </div>
  );
}
