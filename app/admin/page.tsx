import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/content";
import AdminShell, { StatCard, Panel } from "@/components/admin/Shell";
import { BarChart } from "@/components/admin/Charts";

export const dynamic = "force-dynamic";

/**
 * Platform overview.
 *
 * This page used to count leads, because when it was written leads were
 * all there was: eight tiles, four of them slicing the same registration
 * form. The platform has accounts, companies, listings, enquiries and
 * quotations now, and an administrator opening this page needs to know
 * what is waiting on them today, not how the marketing form performed.
 *
 * So the tiles measure the marketplace and the leads panels that still
 * earn their place have stayed. Buyer demand in particular is kept and
 * untouched: a category with buyers and no supplier is the single most
 * actionable thing on the page and it is not on the designed board.
 *
 * Everything reads through the service client, as the other admin pages
 * do, behind requireAdmin above. Certifications have no admin row policy,
 * so the session client would quietly return nothing for them.
 */

type Lead = {
  id: string;
  lead_type: string;
  full_name: string;
  email: string;
  company_name: string | null;
  country_code: string | null;
  categories_of_interest: string[] | null;
  created_at: string;
};

const NAMES = new Map(CATEGORIES.map((c) => [c.slug, c.name]));
const DAY = 24 * 60 * 60 * 1000;

const ROLE_LABEL: Record<string, string> = {
  supplier: "Suppliers",
  buyer: "Retailers",
  shopper: "Shoppers",
  both: "Both",
};
const ROLE_COLOUR: Record<string, string> = {
  supplier: "#D08D1D",
  buyer: "#2FA36B",
  shopper: "#3B82F6",
  both: "#A78BFA",
};

function ago(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function stamp(iso: string) {
  const d = new Date(iso);
  const sameDay = new Date().toDateString() === d.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const svc = serviceClient();

  const [
    profilesRes,
    companiesRes,
    productsRes,
    enquiriesRes,
    quotesRes,
    certsRes,
    leadsRes,
    auditRes,
  ] = await Promise.all([
    svc.from("profiles").select("id, created_at, account_type").limit(5000),
    svc
      .from("companies")
      .select("id, verification_status, company_type, country_code, created_at, updated_at"),
    svc.from("products").select("id, status, company_id"),
    svc.from("enquiries").select("id, status, created_at").limit(5000),
    svc.from("quotations").select("id, status, created_at").limit(5000),
    svc.from("certifications").select("id, status, expires_on").limit(5000),
    svc
      .from("leads")
      .select(
        "id, lead_type, full_name, email, company_name, country_code, categories_of_interest, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(1000),
    svc
      .from("audit_log")
      .select("id, actor_email, action, entity_type, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const profiles = (profilesRes.data ?? []) as {
    created_at: string;
    account_type: string | null;
  }[];
  const companies = (companiesRes.data ?? []) as {
    id: string;
    verification_status: string;
    company_type: string;
    country_code: string | null;
    created_at: string;
    updated_at: string;
  }[];
  const products = (productsRes.data ?? []) as {
    status: string;
    company_id: string;
  }[];
  const enquiries = (enquiriesRes.data ?? []) as {
    status: string;
    created_at: string;
  }[];
  const quotes = (quotesRes.data ?? []) as { status: string; created_at: string }[];
  const certs = (certsRes.data ?? []) as {
    status: string;
    expires_on: string | null;
  }[];
  const leads = (leadsRes.data ?? []) as Lead[];
  const audit = (auditRes.data ?? []) as {
    id: number;
    actor_email: string | null;
    action: string;
    entity_type: string;
    created_at: string;
  }[];

  const weekAgo = Date.now() - 7 * DAY;
  const prevWeekStart = Date.now() - 14 * DAY;
  const since = (iso: string, t: number) => new Date(iso).getTime() > t;

  // ---- Accounts -----------------------------------------------------
  const accountsNew = profiles.filter((p) => since(p.created_at, weekAgo)).length;

  // ---- Verification --------------------------------------------------
  const pending = companies.filter((c) => c.verification_status === "pending");
  // updated_at is when it last moved, which for a pending company is when
  // it was submitted. Closer to "waiting since" than created_at, which is
  // when somebody first typed the company name.
  const oldestWait =
    pending.length === 0
      ? null
      : pending
          .map((c) => c.updated_at)
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

  // ---- Listings pending ----------------------------------------------
  // A listing is live only when its company is verified. An active listing
  // on an unverified company is the queue: published by the supplier, not
  // yet visible to anyone.
  const verifiedIds = new Set(
    companies.filter((c) => c.verification_status === "verified").map((c) => c.id)
  );
  const listingsPending = products.filter(
    (p) => p.status === "active" && !verifiedIds.has(p.company_id)
  ).length;

  // ---- Enquiries -------------------------------------------------------
  const openEnquiries = enquiries.filter((e) => e.status === "open");
  const staleEnquiries = openEnquiries.filter(
    (e) => !since(e.created_at, Date.now() - 7 * DAY)
  ).length;

  // ---- Suppliers --------------------------------------------------------
  const verifiedSuppliers = companies.filter(
    (c) =>
      c.verification_status === "verified" &&
      (c.company_type === "supplier" || c.company_type === "both")
  );
  const origins = new Set(
    verifiedSuppliers.map((c) => c.country_code).filter(Boolean)
  ).size;

  // ---- Quotations --------------------------------------------------------
  // Drafts are a supplier still typing and have not reached the buyer.
  const sentQuotes = quotes.filter((q) => q.status !== "draft");
  const quotesThisWeek = sentQuotes.filter((q) => since(q.created_at, weekAgo)).length;
  const quotesLastWeek = sentQuotes.filter(
    (q) => since(q.created_at, prevWeekStart) && !since(q.created_at, weekAgo)
  ).length;
  const quoteTrend =
    quotesLastWeek === 0
      ? quotesThisWeek > 0
        ? "first week with quotes"
        : "none last week either"
      : `${quotesThisWeek >= quotesLastWeek ? "up" : "down"} from ${quotesLastWeek} last week`;

  // ---- Certificates ------------------------------------------------------
  // Only ones we have accepted: a pending certificate expiring is the
  // supplier's problem to resolve before we look at it, not a cliff edge.
  const soon = Date.now() + 30 * DAY;
  const expiring = certs.filter(
    (c) =>
      c.status === "verified" &&
      c.expires_on &&
      new Date(c.expires_on).getTime() < soon &&
      new Date(c.expires_on).getTime() > Date.now() - 365 * DAY
  ).length;

  // ---- Leads -------------------------------------------------------------
  const leadsThisWeek = leads.filter((l) => since(l.created_at, weekAgo)).length;

  // ---- Sign-ups, last six weeks -------------------------------------------
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const end = Date.now() - i * 7 * DAY;
    const start = end - 7 * DAY;
    const count = profiles.filter((p) => {
      const t = new Date(p.created_at).getTime();
      return t > start && t <= end;
    }).length;
    return { label: i === 0 ? "This wk" : `-${i}wk`, value: count };
  }).reverse();

  // ---- By role ------------------------------------------------------------
  const roleCounts = new Map<string, number>();
  for (const p of profiles) {
    const key = p.account_type ?? "unset";
    roleCounts.set(key, (roleCounts.get(key) ?? 0) + 1);
  }
  const roles = ["supplier", "buyer", "shopper", "both"]
    .map((k) => ({ key: k, label: ROLE_LABEL[k], n: roleCounts.get(k) ?? 0 }))
    .filter((r) => r.n > 0);
  const unset = roleCounts.get("unset") ?? 0;
  const roleMax = Math.max(1, ...roles.map((r) => r.n));

  // ---- Buyer demand, kept from before --------------------------------------
  const demand = new Map<string, { buyers: number; suppliers: number }>();
  for (const lead of leads) {
    for (const slug of lead.categories_of_interest ?? []) {
      const row = demand.get(slug) ?? { buyers: 0, suppliers: 0 };
      if (lead.lead_type === "supplier") row.suppliers += 1;
      else row.buyers += 1;
      demand.set(slug, row);
    }
  }
  const topDemand = [...demand.entries()]
    .sort((a, b) => b[1].buyers + b[1].suppliers - (a[1].buyers + a[1].suppliers))
    .slice(0, 7);
  const maxDemand = Math.max(
    1,
    ...topDemand.map(([, v]) => Math.max(v.buyers, v.suppliers))
  );
  const unmet = topDemand.filter(([, v]) => v.buyers > 0 && v.suppliers === 0).length;

  // ---- Action required ------------------------------------------------------
  // Every line is a real count against real data, so a short list means
  // there is genuinely little to do rather than that a feature is missing.
  const actions = [
    {
      n: pending.length,
      label: "companies waiting for verification",
      href: "/admin/verification",
      cta: "Review",
      tone: "gold" as const,
    },
    {
      n: listingsPending,
      label: "listings waiting on their company being verified",
      href: "/admin/products",
      cta: "Review",
      tone: "gold" as const,
    },
    {
      n: expiring,
      label: "certificates expire within 30 days",
      href: "/admin/companies",
      cta: "View",
      tone: "amber" as const,
    },
    {
      n: staleEnquiries,
      label: "open enquiries older than seven days",
      href: "/admin/companies",
      cta: "View",
      tone: "amber" as const,
    },
    {
      n: unmet,
      label: "categories with buyer demand and no supplier registered",
      href: "/admin/suppliers",
      cta: "View",
      tone: "plain" as const,
    },
  ].filter((a) => a.n > 0);

  return (
    <AdminShell
      admin={admin}
      title="Platform overview"
      subtitle="Live activity across the AfriLynq website"
    >
      {/* ---------- The marketplace, in eight numbers ---------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          value={profiles.length}
          label="Accounts"
          caption={accountsNew > 0 ? `+${accountsNew} this week` : "none new this week"}
          accent="gold"
        />
        <StatCard
          value={pending.length}
          label="Awaiting verification"
          caption={
            oldestWait ? `oldest waiting ${ago(oldestWait)}` : "nothing waiting"
          }
          accent={pending.length > 0 ? "red" : "green"}
        />
        <StatCard
          value={listingsPending}
          label="Listings pending"
          caption={
            listingsPending > 0 ? "not public until verified" : "none held back"
          }
          accent={listingsPending > 0 ? "blue" : "slate"}
        />
        <StatCard
          value={openEnquiries.length}
          label="Open enquiries"
          caption={
            staleEnquiries > 0
              ? `${staleEnquiries} older than 7 days`
              : "none ageing"
          }
          accent={staleEnquiries > 0 ? "red" : "slate"}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          value={verifiedSuppliers.length}
          label="Verified suppliers"
          caption={origins === 0 ? "none yet" : `across ${origins} origins`}
          accent="green"
        />
        <StatCard
          value={quotesThisWeek}
          label="Quotes this week"
          caption={quoteTrend}
          accent="gold"
        />
        <StatCard
          value={expiring}
          label="Certificates expiring"
          caption={expiring > 0 ? "within 30 days" : "none in the next 30 days"}
          accent={expiring > 0 ? "red" : "slate"}
        />
        <StatCard
          value={leadsThisWeek}
          label="New leads"
          caption="registrations this week"
          accent="blue"
        />
      </div>

      {/* ---------- What is waiting on somebody here ---------- */}
      <div className="mt-6">
        <Panel title="Action required">
          {actions.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">
              Nothing needs attention. Verifications, held listings and ageing
              enquiries appear here.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {actions.map((a) => (
                <li key={a.label}>
                  <Link
                    href={a.href}
                    className="flex items-center gap-3.5 rounded-lg bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.07]"
                  >
                    <span
                      className={
                        "tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold " +
                        (a.tone === "gold"
                          ? "bg-gold text-[#042115]"
                          : a.tone === "amber"
                            ? "bg-gold/20 text-gold"
                            : "bg-white/10 text-white/70")
                      }
                    >
                      {a.n}
                    </span>
                    <span className="text-sm leading-snug text-white/75">
                      {a.label}
                    </span>
                    <span className="ml-auto shrink-0 rounded-lg border border-white/15 px-3.5 py-1.5 text-xs font-medium text-white/80">
                      {a.cta}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ---------- Growth ---------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Panel title="Sign-ups, last six weeks">
            <BarChart data={weeks} />
          </Panel>
        </div>

        <div className="lg:col-span-2">
          <Panel title="By role">
            {roles.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/40">
                No accounts yet.
              </p>
            ) : (
              <>
                <ul className="space-y-3.5">
                  {roles.map((r) => (
                    <li key={r.key}>
                      <div className="flex items-baseline justify-between gap-4 text-sm">
                        <span className="text-white/75">{r.label}</span>
                        <span className="tabular text-white">{r.n}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(r.n / roleMax) * 100}%`,
                            background: ROLE_COLOUR[r.key],
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                {unset > 0 && (
                  <p className="mt-4 text-xs text-white/35">
                    {unset} older {unset === 1 ? "account" : "accounts"} signed up
                    before we asked, and before social sign-in sent it.
                  </p>
                )}
              </>
            )}
          </Panel>
        </div>
      </div>

      {/* ---------- What has been happening ---------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Recent activity"
          action={
            <Link href="/admin/audit" className="text-sm text-gold hover:underline">
              Audit log
            </Link>
          }
        >
          {audit.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">
              Nothing logged yet. Verification decisions and listing changes
              appear here.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {audit.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-4 rounded-lg bg-white/[0.03] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">
                      {a.action.replace(/[_.]/g, " ")}
                    </p>
                    <p className="truncate text-xs text-white/45">
                      {a.actor_email ?? "system"} &middot; {a.entity_type}
                    </p>
                  </div>
                  <span className="tabular shrink-0 text-xs text-white/40">
                    {stamp(a.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Buyer demand. Kept exactly as it was: a category with buyers and
            no supplier is the one thing on this page that tells AfriLynq
            who to go out and recruit. */}
        <Panel
          title="Buyer demand"
          action={
            <span className="text-xs text-white/35">
              buyers against suppliers, by product interest
            </span>
          }
        >
          {topDemand.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">
              No product interest recorded yet.
            </p>
          ) : (
            <>
              <ul className="space-y-4">
                {topDemand.map(([slug, v]) => (
                  <li key={slug}>
                    <div className="flex items-baseline justify-between gap-4 text-sm">
                      <span className="text-white/75">{NAMES.get(slug) ?? slug}</span>
                      <span className="tabular text-xs text-white/45">
                        <span className="text-[#4CC98D]">{v.buyers} buying</span>
                        {" · "}
                        <span className="text-gold">{v.suppliers} supplying</span>
                      </span>
                    </div>
                    <div className="mt-1.5 space-y-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full bg-[#2FA36B]"
                          style={{ width: `${(v.buyers / maxDemand) * 100}%` }}
                        />
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full bg-gold"
                          style={{ width: `${(v.suppliers / maxDemand) * 100}%` }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {unmet > 0 && (
                <p className="mt-5 rounded border-l-2 border-gold bg-white/[0.04] px-4 py-3 text-sm text-white/70">
                  {unmet === 1 ? "One category has" : `${unmet} categories have`} buyer
                  interest and no supplier registered against{" "}
                  {unmet === 1 ? "it" : "them"}. Those are the suppliers worth going
                  out to find.
                </p>
              )}
            </>
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}
