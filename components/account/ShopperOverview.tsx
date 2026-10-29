import Link from "next/link";
import { sessionClient } from "@/lib/supabase-server";
import { publicListings, catalogueLabels } from "@/lib/catalogue";
import { COUNTRIES } from "@/lib/countries";
import ListingCard from "@/components/catalogue/ListingCard";

/**
 * A shopper's overview.
 *
 * A shopper has no company, no listings, no documents and nothing to be
 * verified. Almost everything on the supplier overview is therefore
 * meaningless to them, and the company-first overview sent them to a page
 * telling them to register a business, which is the one thing a shopper
 * signed up specifically not to do.
 *
 * So this screen answers the only two questions a shopper has: what can I
 * buy, and what did I ask for. The produce shown is drawn from the
 * categories they picked at sign-up, which is the only reason we asked.
 */

const SEASONS: [string, string][] = [
  ["January", "Sesame, ginger and early cashew"],
  ["February", "Cashew, shea nuts and cocoa"],
  ["March", "Cashew, mango and shea nuts"],
  ["April", "Mango, shea nuts and cashew"],
  ["May", "Mango, plantain and early yam"],
  ["June", "Plantain, pineapple and early maize"],
  ["July", "Maize, yam and melon seed"],
  ["August", "Maize, yam and groundnut"],
  ["September", "Yam, groundnut and cocoa"],
  ["October", "Beans and African rice"],
  ["November", "Rice, beans and sesame"],
  ["December", "Sesame, ginger and hibiscus"],
];

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "Waiting on supplier", cls: "bg-gold/20 text-forest-deep" },
  quoted: { label: "Replied", cls: "bg-forest/15 text-forest" },
  closed: { label: "Closed", cls: "bg-sand-deep text-stone" },
  cancelled: { label: "Cancelled", cls: "bg-sand-deep text-stone" },
};

interface Recent {
  id: string;
  reference: string | null;
  product_name_snapshot: string | null;
  quantity: number | null;
  unit_code: string | null;
  status: string;
  created_at: string;
}

function day(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export default async function ShopperOverview({
  profileId,
  name,
  interests,
}: {
  profileId: string;
  name: string;
  interests: string[];
}) {
  const supabase = await sessionClient();

  // Everything in parallel. The listings query is the slow one and it does
  // not depend on the others.
  const [{ data: recentData }, labels] = await Promise.all([
    supabase
      .from("enquiries")
      .select("id, reference, product_name_snapshot, quantity, unit_code, status, created_at")
      // Row security already limits this to their own rows. Saying it again
      // here is not redundancy: it keeps the query honest if this component
      // is ever rendered for somebody else.
      .eq("buyer_profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(4),
    catalogueLabels().catch(() => ({ categories: [], units: [] })),
  ]);

  const recent = (recentData ?? []) as Recent[];

  // Their categories, as the catalogue knows them. A slug they picked that
  // has since been retired simply drops out rather than rendering as a
  // broken chip.
  const chosen = labels.categories.filter((c) => interests.includes(c.slug));

  // What to show them. Their first category if they gave us one, otherwise
  // whatever is live, so the screen is never empty on day one.
  const listings = await publicListings({
    category: chosen[0]?.slug,
    limit: 3,
  }).catch(() => []);

  const catName = new Map(labels.categories.map((c) => [c.id, c.name]));
  const unitName = new Map(labels.units.map((u) => [u.code, u.plural_name || u.name]));
  const countryName = new Map(COUNTRIES.map((c) => [c.code, c.name]));
  const [month, produce] = SEASONS[new Date().getMonth()];

  return (
    <div className="space-y-6">
      {/* ---------- What you are looking for ---------- */}
      <section className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            <h2 className="text-2xl">Good to have you, {name}</h2>
            <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
              Buy direct from farms and exporters we have checked ourselves,
              in the quantities a household actually uses.
            </p>
          </div>
          <Link href="/marketplace" className="btn-lift btn-primary shrink-0">
            Browse produce
          </Link>
        </div>

        {chosen.length > 0 ? (
          <div className="mt-6 border-t border-sand pt-5">
            <p className="text-xs font-semibold tracking-widest text-forest uppercase">
              You said you were looking for
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {chosen.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/marketplace?category=${c.slug}`}
                    className="inline-block rounded-full border border-sand-deep px-3.5 py-1.5 text-sm text-ink-soft transition-colors hover:border-forest hover:text-forest"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-stone">
              Changed your mind?{" "}
              <Link href="/account/settings" className="link-quiet text-forest">
                Update what you are looking for
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="mt-6 border-t border-sand pt-5">
            <p className="text-sm leading-relaxed text-ink-soft">
              Tell us what you are looking for and we will put it at the top
              of this page.{" "}
              <Link href="/account/settings" className="link-quiet text-forest">
                Choose your produce
              </Link>
              .
            </p>
          </div>
        )}
      </section>

      {/* ---------- In season ---------- */}
      <section className="rounded-xl border-l-2 border-forest bg-forest/5 px-6 py-5">
        <p className="text-xs font-semibold tracking-widest text-forest uppercase">
          In season in {month}
        </p>
        <p className="mt-2 leading-relaxed text-ink">{produce}</p>
      </section>

      {/* ---------- Worth a look ---------- */}
      {listings.length > 0 && (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-xl">
              {chosen[0] ? `${chosen[0].name} on AfriLynq` : "Fresh on AfriLynq"}
            </h2>
            <Link href="/marketplace" className="link-quiet text-sm text-ink-soft">
              See everything &rarr;
            </Link>
          </div>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                categoryName={catName.get(l.categoryId) ?? null}
                unitName={unitName.get(l.unitCode) ?? l.unitCode}
                countryName={
                  l.originCountryCode ? (countryName.get(l.originCountryCode) ?? null) : null
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* ---------- What you have asked for ---------- */}
      <section className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-xl">Your requests</h2>
          {recent.length > 0 && (
            <Link href="/account/requests" className="link-quiet text-sm text-ink-soft">
              See all &rarr;
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
            You have not asked for anything yet. Open any listing and use
            "Ask for a price": tell the supplier how much you want and where
            it is going, and their reply turns up here.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-sand-deep border-t border-sand-deep">
            {recent.map((r) => {
              const s = STATUS[r.status] ?? STATUS.open;
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3.5"
                >
                  <span className="min-w-0">
                    <span className="block text-ink">
                      {r.product_name_snapshot ?? "Request"}
                    </span>
                    <span className="text-sm text-stone">
                      {r.reference ? `${r.reference} · ` : ""}
                      {r.quantity ? `${r.quantity} ${r.unit_code ?? ""} · ` : ""}
                      {day(r.created_at)}
                    </span>
                  </span>
                  <span
                    className={
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium " + s.cls
                    }
                  >
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
