import Link from "next/link";
import {
  sessionClient,
  companyDetail,
  type MemberCompany,
} from "@/lib/supabase-server";

/**
 * The supplier overview.
 *
 * Four numbers, the state of the company, the shortest route to the next
 * useful thing, and what has happened lately. The order is deliberate: a
 * supplier who signs in wants to know whether anyone is waiting on them
 * before they want anything else.
 *
 * Every query runs through the session client, so row level security limits
 * it to this person's companies.
 */

const VERIFICATION: Record<
  string,
  { label: string; tone: "waiting" | "good" | "stopped"; note: string }
> = {
  unverified: {
    label: "Not yet submitted",
    tone: "waiting",
    note: "Add your certificates and registration documents, then submit for verification. Nothing of yours is public until it is verified.",
  },
  pending: {
    label: "In review",
    tone: "waiting",
    note: "Your documents are with our team. Nothing is public until you are verified, but you can build your listings now.",
  },
  verified: {
    label: "Verified",
    tone: "good",
    note: "Your company appears in the directory and buyers can find you. Keep your certificates up to date so this does not lapse.",
  },
  rejected: {
    label: "Not accepted",
    tone: "stopped",
    note: "We could not verify the company on the documents supplied. The reason is on your documents page, and you can upload replacements and submit again.",
  },
  suspended: {
    label: "Suspended",
    tone: "stopped",
    note: "This company is not currently listed. Email info@afrilynq.co.uk if you think this is a mistake.",
  },
};

/**
 * What is commonly at peak in West Africa, by month. Seasonality is the one
 * thing a supplier knows better than we do, so this prompts rather than
 * instructs, and names only crops the platform already carries categories for.
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

function Stat({
  label,
  value,
  caption,
  muted,
}: {
  label: string;
  value: number;
  caption: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-sand-deep bg-paper p-5 shadow-sm">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className={"mt-2 text-3xl font-semibold " + (muted ? "text-stone" : "text-forest")}>
        {value}
      </p>
      <p className="mt-1 text-sm leading-snug text-stone">{caption}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const state = VERIFICATION[status] ?? VERIFICATION.unverified;
  const tone =
    state.tone === "good"
      ? "bg-forest/10 text-forest"
      : state.tone === "stopped"
        ? // No red in the palette, and a rejection should not read as a
          // warning badge. A muted terracotta sits beside the sand without
          // shouting, and the note underneath carries the detail.
          "bg-[#f6e3e0] text-[#8c3b2c]"
        : "bg-gold/15 text-gold-deep";

  return (
    <span className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${tone}`}>
      {state.label}
    </span>
  );
}

function when(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function OverviewExtras({
  companyIds,
  primary,
}: {
  companyIds: string[];
  primary: MemberCompany;
}) {
  const supabase = await sessionClient();
  const detail = await companyDetail(primary.id);
  const state = VERIFICATION[primary.verification_status] ?? VERIFICATION.unverified;
  const verified = primary.verification_status === "verified";

  const head = { count: "exact" as const, head: true };
  const [active, anyListing, enquiries, docs, views, certs, recentProducts, born] =
    await Promise.all([
      supabase.from("products").select("id", head).in("company_id", companyIds).eq("status", "active"),
      supabase.from("products").select("id", head).eq("company_id", primary.id),
      supabase.from("enquiries").select("id", head).in("supplier_company_id", companyIds).eq("status", "open"),
      supabase.from("certifications").select("id", head).eq("company_id", primary.id),
      supabase.from("products").select("view_count").in("company_id", companyIds),
      supabase
        .from("certifications")
        .select("name, status, created_at")
        .eq("company_id", primary.id)
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("products")
        .select("title, created_at")
        .eq("company_id", primary.id)
        .order("created_at", { ascending: false })
        .limit(4),
      supabase.from("companies").select("created_at").eq("id", primary.id).maybeSingle(),
    ]);

  const totalViews = (views.data ?? []).reduce(
    (sum, r) => sum + (Number(r.view_count) || 0),
    0
  );

  const hidden = "Public after verification";

  // The checklist. Each row carries its own verb, because "Go" four times
  // down a page tells the person nothing about what they are about to do.
  const checks = [
    {
      done: (anyListing.count ?? 0) > 0,
      label: "Add your first listing",
      action: "Add listing",
      href: "/account/products/new",
      primary: true,
    },
    {
      done: Boolean(detail?.logo_path),
      label: "Add your company logo",
      action: "Upload",
      href: "/account/company",
    },
    {
      done: Boolean(detail?.short_description?.trim()),
      label: "Add a one-line description",
      action: "Write",
      href: "/account/company",
    },
    {
      done: (detail?.about ?? "").trim().length >= 40,
      label: "Write the longer company description",
      action: "Write",
      href: "/account/company",
    },
    {
      done: Boolean(detail?.tax_number?.trim()),
      label: "Add your tax number",
      action: "Add",
      href: "/account/company",
    },
    {
      done: (docs.count ?? 0) > 0,
      label: "Upload an export licence or quality certificate",
      action: "Upload",
      href: "/account/documents",
    },
  ];
  const todo = checks.filter((c) => !c.done);
  const pct = Math.round(((checks.length - todo.length) / checks.length) * 100);

  // Recent activity, built from the person's own rows rather than the audit
  // log, which only administrators may read.
  const activity = [
    ...(certs.data ?? []).map((c) => ({
      at: c.created_at as string,
      text:
        c.status === "verified"
          ? `Document ${c.name} verified`
          : c.status === "rejected"
            ? `Document ${c.name} not accepted`
            : `Document ${c.name} submitted for review`,
    })),
    ...(recentProducts.data ?? []).map((p) => ({
      at: p.created_at as string,
      text: `Listing ${p.title} created`,
    })),
    { at: (born.data?.created_at as string | undefined) ?? "", text: "Company profile created" },
  ]
    .filter((e) => Boolean(e.at))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 5);

  const [month, produce] = SEASONS[new Date().getMonth()];

  return (
    <div className="space-y-6">
      {/* ---------- The four numbers ---------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Profile views"
          value={totalViews}
          caption={verified ? "Across your listings" : hidden}
          muted={!verified}
        />
        <Stat
          label="Enquiries"
          value={enquiries.count ?? 0}
          caption={
            (enquiries.count ?? 0) === 0
              ? "Waiting for your first listing"
              : "Waiting for your reply"
          }
        />
        <Stat
          label="Active listings"
          value={active.count ?? 0}
          caption={verified ? "Live in the directory" : hidden}
          muted={!verified}
        />
        <Stat label="Unread messages" value={0} caption="Messaging arrives in Stage 3" muted />
      </div>

      {/* ---------- Your company ---------- */}
      <section className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl">Your company</h2>
            <p className="mt-1 text-sm text-stone">
              {primary.trading_name || primary.legal_name}
              {detail?.city && <> &middot; {detail.city}</>}
            </p>
          </div>
          <StatusPill status={primary.verification_status} />
        </div>

        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">{state.note}</p>

        <div className="mt-5 flex items-center gap-4">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-sand-deep"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile completeness"
          >
            <div className="h-full rounded-full bg-forest transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 text-sm text-ink-soft">Profile {pct}% complete</span>
        </div>

        {todo.length > 0 ? (
          <ul className="mt-5 divide-y divide-sand-deep border-t border-sand-deep">
            {todo.map((c) => (
              <li
                key={c.label}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <span className="text-ink">{c.label}</span>
                <Link
                  href={c.href}
                  className={
                    "btn-lift rounded-lg px-5 py-2.5 text-sm font-medium transition-colors " +
                    (c.primary
                      ? "bg-forest text-paper hover:bg-gold hover:text-forest-deep"
                      : "border border-sand-deep text-forest hover:border-forest")
                  }
                >
                  {c.action}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 border-t border-sand-deep pt-5 text-sm text-ink-soft">
            Your profile is complete. Nothing is outstanding on your side.
          </p>
        )}
      </section>

      {/* ---------- Seasonality ---------- */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gold/40 bg-gold/8 px-6 py-5">
        <div className="min-w-0">
          <p className="font-semibold text-forest">In season now: {month}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">
            {produce} are commonly at peak. Suppliers who list in peak months get
            found first.
          </p>
        </div>
        <Link
          href="/account/products/new"
          className="btn-lift shrink-0 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-forest-deep transition-colors hover:bg-gold-deep"
        >
          List a peak product
        </Link>
      </section>

      {/* ---------- Recent activity ---------- */}
      {activity.length > 0 && (
        <section className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
          <h2 className="text-xl">Recent activity</h2>
          <ul className="mt-4 divide-y divide-sand-deep border-t border-sand-deep">
            {activity.map((e, i) => (
              <li
                key={`${e.at}-${i}`}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
              >
                <span className="min-w-0 text-ink-soft">{e.text}</span>
                <span className="shrink-0 text-sm text-stone">{when(e.at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
