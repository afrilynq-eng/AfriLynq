import Link from "next/link";
import { sessionClient, type MemberCompany } from "@/lib/supabase-server";

/**
 * A retailer's overview.
 *
 * A retailer has a company, so until now they fell into OverviewExtras and
 * got the supplier screen: listings, photograph counts, catalogue views,
 * certificates, and a checklist telling them to add their first listing. A
 * retailer has no listings and never will. Everything they actually do runs
 * the other way: send a specification, wait, compare what comes back.
 *
 * So this screen answers a buyer's three questions. What is still out with
 * suppliers, what has come back, and what should I be sourcing now.
 *
 * Two tiles from the designed board are deliberately missing. Saved
 * suppliers and unread messages have no tables behind them and are marked
 * "Soon" in the sidebar; a tile that reads zero forever is worse than no
 * tile. "Suppliers contacted" replaces them with something true.
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
  open: { label: "Open", cls: "bg-gold/20 text-forest-deep" },
  quoted: { label: "Quotes in", cls: "bg-forest/15 text-forest" },
  closed: { label: "Closed", cls: "bg-sand-deep text-stone" },
  cancelled: { label: "Cancelled", cls: "bg-sand-deep text-stone" },
};

const VERIFICATION: Record<string, { line: string; tone: string }> = {
  unverified: {
    line: "Add your company details and we will run your buyer check.",
    tone: "gold",
  },
  pending: {
    line: "Your buyer check is with us. Suppliers can see your enquiries in the meantime.",
    tone: "forest",
  },
  rejected: {
    line: "We could not complete your buyer check. Email info@afrilynq.co.uk and we will go through it with you.",
    tone: "gold",
  },
  suspended: {
    line: "This account is suspended. Email info@afrilynq.co.uk.",
    tone: "gold",
  },
};

interface Row {
  id: string;
  reference: string | null;
  product_name_snapshot: string | null;
  quantity: number | null;
  unit_code: string | null;
  incoterm: string | null;
  delivery_city: string | null;
  required_by: string | null;
  status: string;
  created_at: string;
}

function Stat({
  label,
  value,
  note,
  strong,
}: {
  label: string;
  value: number;
  note: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl border border-sand-deep bg-paper p-6 shadow-sm">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-2 text-4xl font-semibold text-forest">{value}</p>
      <p className={"mt-2 text-sm " + (strong ? "font-medium text-forest" : "text-stone")}>
        {note}
      </p>
    </div>
  );
}

function when(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function BuyerOverview({
  companyIds,
  primary,
}: {
  companyIds: string[];
  primary: MemberCompany;
}) {
  const supabase = await sessionClient();
  const head = { count: "exact" as const, head: true };

  const [open, mine, recent] = await Promise.all([
    supabase
      .from("enquiries")
      .select("id", head)
      .in("buyer_company_id", companyIds)
      .eq("status", "open"),
    // Every enquiry they have sent, for the supplier count and the quote
    // lookup below. Capped, because this is a dashboard tile and not a
    // report.
    supabase
      .from("enquiries")
      .select("id, supplier_company_id")
      .in("buyer_company_id", companyIds)
      .limit(500),
    supabase
      .from("enquiries")
      .select(
        "id, reference, product_name_snapshot, quantity, unit_code, incoterm, delivery_city, required_by, status, created_at"
      )
      .in("buyer_company_id", companyIds)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const all = (mine.data ?? []) as { id: string; supplier_company_id: string }[];
  const suppliers = new Set(all.map((r) => r.supplier_company_id)).size;

  // Quotes that have actually been sent. A draft quotation is the
  // supplier still writing, and counting it would promise the buyer
  // something they cannot open.
  let quotes = 0;
  const quotesPer: Record<string, number> = {};
  if (all.length > 0) {
    const { data } = await supabase
      .from("quotations")
      .select("enquiry_id")
      .in(
        "enquiry_id",
        all.map((r) => r.id)
      )
      .neq("status", "draft");
    for (const q of (data ?? []) as { enquiry_id: string }[]) {
      quotes += 1;
      quotesPer[q.enquiry_id] = (quotesPer[q.enquiry_id] ?? 0) + 1;
    }
  }

  const rows = (recent.data ?? []) as Row[];
  const [month, produce] = SEASONS[new Date().getMonth()];
  const state = VERIFICATION[primary.verification_status];

  return (
    <div className="space-y-6">
      {/* ---------- Where things stand ---------- */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label="Open requests"
          value={open.count ?? 0}
          note={(open.count ?? 0) === 0 ? "Nothing out with suppliers" : "Waiting on suppliers"}
        />
        <Stat
          label="Quotes received"
          value={quotes}
          note={quotes === 0 ? "None yet" : "Ready to compare"}
          strong={quotes > 0}
        />
        <Stat
          label="Suppliers contacted"
          value={suppliers}
          note={suppliers === 0 ? "Start with the marketplace" : "Across your requests"}
        />
      </div>

      {/* ---------- The thing a buyer is here to do ----------
          The designed board puts a "Post a sourcing request" button here,
          which broadcasts one specification to every supplier who can meet
          it. That does not exist yet, so this sends them the way requests
          are actually made today, through a listing. Writing the button
          before the feature would be the only dishonest thing on the page. */}
      <section className="rounded-xl bg-forest px-7 py-6 text-paper">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-paper">Source something new</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-paper/80">
              Find a listing, tell the supplier how much you need and on what
              terms, and their reply lands in your requests.
            </p>
          </div>
          <Link
            href="/marketplace"
            className="btn-lift shrink-0 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-forest-deep transition-opacity hover:opacity-90"
          >
            Browse produce
          </Link>
        </div>
      </section>

      {state && (
        <p
          className={
            "rounded-xl border-l-2 px-6 py-4 text-sm leading-relaxed " +
            (state.tone === "forest"
              ? "border-forest bg-forest/5 text-ink"
              : "border-gold bg-sand/60 text-ink")
          }
        >
          {state.line}
          {primary.verification_status === "unverified" && (
            <>
              {" "}
              <Link href="/account/company" className="link-quiet text-forest">
                Open your company profile
              </Link>
              .
            </>
          )}
        </p>
      )}

      {/* ---------- What they have asked for ---------- */}
      <section className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-xl">Your requests</h2>
          {rows.length > 0 && (
            <Link href="/account/requests" className="link-quiet text-sm text-ink-soft">
              See all &rarr;
            </Link>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
            You have not asked for anything yet. Open any listing and use
            &quot;Ask for a price&quot;: give the quantity, when you need it
            and the terms, and the supplier replies here.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-sand-deep border-t border-sand-deep">
            {rows.map((r) => {
              const s = STATUS[r.status] ?? STATUS.open;
              const n = quotesPer[r.id] ?? 0;
              const line = [
                r.incoterm,
                r.delivery_city,
                r.required_by ? `needed by ${when(r.required_by)}` : null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-ink">
                      {r.product_name_snapshot ?? "Request"}
                      {r.quantity ? `, ${r.quantity} ${r.unit_code ?? ""}` : ""}
                    </span>
                    <span className="text-sm text-stone">
                      {line || (r.reference ?? "")}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-sm text-stone">
                      {n === 0 ? "No quotes" : n === 1 ? "1 quote" : `${n} quotes`}
                    </span>
                    <span
                      className={"rounded-full px-2.5 py-1 text-xs font-medium " + s.cls}
                    >
                      {s.label}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------- In season ---------- */}
      <section className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-sand-deep bg-sand/50 px-6 py-5">
        <div className="min-w-0">
          <p className="font-semibold text-forest">In season now: {month}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            {produce} are at their peak.
          </p>
        </div>
        <Link
          href="/marketplace"
          className="btn-lift shrink-0 rounded-lg border border-sand-deep bg-paper px-5 py-2.5 text-sm font-medium text-forest transition-colors hover:border-forest"
        >
          Browse in season
        </Link>
      </section>
    </div>
  );
}
