import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin, sessionClient } from "@/lib/supabase-server";
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

  /**
   * One round trip, not eight.
   *
   * This page used to pull profiles, companies, products, enquiries,
   * quotations and certifications in full and count them here. Every tile
   * is a count Postgres does in microseconds, so it does them, and the
   * rows stay in London. Leads and the audit tail are still read directly
   * because both are shown as lists, not counted.
   */
  // The dashboard call goes through the administrator's own session, so
  // auth.uid() is set and the function can verify for itself who is
  // asking. Everything else stays on the service key.
  const session = await sessionClient();

  const [dashRes, leadsRes, auditRes] = await Promise.all([
    session.rpc("admin_dashboard"),
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

  const d = (dashRes.data ?? {}) as {
    accounts_total?: number;
    accounts_new?: number;
    roles?: Record<string, number>;
    signups?: number[];
    pending_companies?: number;
    oldest_pending?: string | null;
    listings_pending?: number;
    open_enquiries?: number;
    stale_enquiries?: number;
    verified_suppliers?: number;
    origin_countries?: number;
    quotes_this_week?: number;
    quotes_last_week?: number;
    certs_expiring?: number;
    leads_this_week?: number;
  };

  const leads = (leadsRes.data ?? []) as Lead[];
  const audit = (auditRes.data ?? []) as {
    id: number;
    actor_email: string | null;
    action: string;
    entity_type: string;
    created_at: string;
  }[];

  const accountsTotal = d.accounts_total ?? 0;
  const accountsNew = d.accounts_new ?? 0;
  const pendingCompanies = d.pending_companies ?? 0;
  const oldestWait = d.oldest_pending ?? null;
  const listingsPending = d.listings_pending ?? 0;
  const openEnquiryCount = d.open_enquiries ?? 0;
  const staleEnquiries = d.stale_enquiries ?? 0;
  const supplierCount = d.verified_suppliers ?? 0;
  const origins = d.origin_countries ?? 0;
  const quotesThisWeek = d.quotes_this_week ?? 0;
  const quotesLastWeek = d.quotes_last_week ?? 0;
  const expiring = d.certs_expiring ?? 0;
  const leadsThisWeek = d.leads_this_week ?? 0;

  const quoteTrend =
    quotesLastWeek === 0
      ? quotesThisWeek > 0
        ? "first week with quotes"
        : "none last week either"
      : `${quotesThisWeek >= quotesLastWeek ? "up" : "down"} from ${quotesLastWeek} last week`;

  const WEEK_LABELS = ["-5wk", "-4wk", "-3wk", "-2wk", "-1wk", "This wk"];
  const weeks = (d.signups ?? [0, 0, 0, 0, 0, 0]).map((value, i) => ({
    label: WEEK_LABELS[i] ?? "",
    value,
  }));

  const roleCounts = new Map<string, number>(
    Object.entries(d.roles ?? {}).map(([k, v]) => [k, Number(v)])
  );

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
      n: pendingCompanies,
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
          value={accountsTotal}
          label="Accounts"
          caption={accountsNew > 0 ? `+${accountsNew} this week` : "none new this week"}
          accent="gold"
        />
        <StatCard
          value={pendingCompanies}
          label="Awaiting verification"
          caption={
            oldestWait ? `oldest waiting ${ago(oldestWait)}` : "nothing waiting"
          }
          accent={pendingCompanies > 0 ? "red" : "green"}
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
          value={openEnquiryCount}
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
          value={supplierCount}
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
