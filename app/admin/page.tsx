import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin, sessionClient } from "@/lib/supabase-server";
import { CATEGORIES } from "@/lib/content";
import AdminShell, { StatCard, Panel } from "@/components/admin/Shell";
import { BarChart, Donut } from "@/components/admin/Charts";

export const dynamic = "force-dynamic";

type Lead = {
  id: string;
  lead_type: string;
  full_name: string;
  email: string;
  company_name: string | null;
  country_code: string | null;
  categories_of_interest: string[] | null;
  message: string | null;
  created_at: string;
};

const NAMES = new Map(CATEGORIES.map((c) => [c.slug, c.name]));

const DAY = 24 * 60 * 60 * 1000;

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const supabase = await sessionClient();
  const { data } = await supabase
    .from("leads")
    .select(
      "id, lead_type, full_name, email, company_name, country_code, categories_of_interest, message, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(1000);

  const leads = (data ?? []) as Lead[];

  const buyers = leads.filter((l) => l.lead_type === "buyer").length;
  const suppliers = leads.filter((l) => l.lead_type === "supplier").length;
  const others = leads.filter((l) => l.lead_type === "other").length;

  const weekAgo = Date.now() - 7 * DAY;
  const prevWeekStart = Date.now() - 14 * DAY;

  /**
   * Section 3 of AfriLynq's dashboard note asked for a specific metric in place
   * of a vague "this week". Registrations is the one number that means
   * something before orders exist, and it is shown against the week before so
   * it reads as a direction rather than a bare count.
   */
  const newThisWeek = leads.filter(
    (l) => new Date(l.created_at).getTime() > weekAgo
  ).length;
  const newLastWeek = leads.filter((l) => {
    const t = new Date(l.created_at).getTime();
    return t > prevWeekStart && t <= weekAgo;
  }).length;
  const weekTrend =
    newLastWeek === 0
      ? newThisWeek > 0
        ? "first week with registrations"
        : "no registrations last week"
      : `${newThisWeek >= newLastWeek ? "up" : "down"} from ${newLastWeek} last week`;

  // Last six weeks, oldest first.
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const end = Date.now() - i * 7 * DAY;
    const start = end - 7 * DAY;
    const count = leads.filter((l) => {
      const t = new Date(l.created_at).getTime();
      return t > start && t <= end;
    }).length;
    return { label: i === 0 ? "This wk" : `-${i}wk`, value: count };
  }).reverse();

  /**
   * Section 5: buyer demand intelligence.
   *
   * Every registration records what the person is looking to source, so demand
   * by product is real data rather than an estimate. Split by side of the
   * trade, because a category with many buyers and no suppliers is the signal
   * worth acting on: it tells AfriLynq which suppliers to go and find.
   */
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

  /**
   * Section 8: action required.
   *
   * Only conditions that can be answered from data that exists today. Nothing
   * here is a placeholder, so a count of zero means there is genuinely nothing
   * to do rather than that a feature is missing.
   */
  const newRegistrations = leads.filter(
    (l) => new Date(l.created_at).getTime() > Date.now() - 2 * DAY
  ).length;

  const waiting = leads.filter((l) => {
    const age = Date.now() - new Date(l.created_at).getTime();
    return age > 7 * DAY && age < 60 * DAY;
  }).length;

  const noCompany = leads.filter(
    (l) => l.lead_type === "supplier" && !l.company_name
  ).length;

  const noCategory = leads.filter(
    (l) =>
      l.lead_type !== "other" &&
      (!l.categories_of_interest || l.categories_of_interest.length === 0)
  ).length;

  const actions = [
    {
      n: newRegistrations,
      label: "registrations in the last 48 hours to review",
      href: "/admin/leads",
      tone: "gold" as const,
    },
    {
      n: waiting,
      label: "enquiries older than seven days",
      href: "/admin/leads",
      tone: "amber" as const,
    },
    {
      n: unmet,
      label: "categories with buyer demand and no supplier registered",
      href: "/admin/suppliers",
      tone: "amber" as const,
    },
    {
      n: noCompany,
      label: "suppliers registered without a business name",
      href: "/admin/suppliers",
      tone: "plain" as const,
    },
    {
      n: noCategory,
      label: "registrations with no product interest recorded",
      href: "/admin/leads",
      tone: "plain" as const,
    },
  ].filter((a) => a.n > 0);

  return (
    <AdminShell
      admin={admin}
      title="Platform overview"
      subtitle="Live activity across the AfriLynq website"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={leads.length} label="Total leads" caption="all time" accent="gold" />
        <StatCard value={buyers} label="Buyers" caption="sourcing requests" accent="green" />
        <StatCard value={suppliers} label="Suppliers" caption="registered interest" accent="blue" />
        <StatCard
          value={newThisWeek}
          label="New registrations this week"
          caption={weekTrend}
          accent="slate"
        />
      </div>

      {/* Action required */}
      <div className="mt-6">
        <Panel title="Action required">
          {actions.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">
              Nothing needs attention. New registrations and ageing enquiries appear
              here.
            </p>
          ) : (
            <ul className="grid gap-2.5 sm:grid-cols-2">
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
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Panel title="Leads, last six weeks">
            <BarChart data={weeks} />
          </Panel>
        </div>

        <div className="lg:col-span-2">
          <Panel title="By type">
            <Donut
              segments={[
                { label: "Buyers", value: buyers, colour: "#2FA36B" },
                { label: "Suppliers", value: suppliers, colour: "#D08D1D" },
                { label: "Subscribers", value: others, colour: "#3B82F6" },
              ]}
            />
          </Panel>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Recent registrations"
          action={
            <Link href="/admin/leads" className="text-sm text-gold hover:underline">
              View all
            </Link>
          }
        >
          {leads.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">
              Nothing yet. Submissions from the website appear here.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {leads.slice(0, 6).map((lead) => (
                <li
                  key={lead.id}
                  className="flex items-center justify-between gap-4 rounded-lg bg-white/[0.03] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-white">{lead.full_name}</p>
                    <p className="truncate text-sm text-white/45">
                      {lead.company_name ?? lead.email}
                      {lead.country_code && ` \u00b7 ${lead.country_code}`}
                    </p>
                  </div>
                  <span
                    className={
                      lead.lead_type === "supplier"
                        ? "shrink-0 rounded bg-gold/20 px-2.5 py-1 text-xs text-gold"
                        : lead.lead_type === "buyer"
                          ? "shrink-0 rounded bg-[#2FA36B]/20 px-2.5 py-1 text-xs text-[#4CC98D]"
                          : "shrink-0 rounded bg-[#3B82F6]/20 px-2.5 py-1 text-xs text-[#7CADFA]"
                    }
                  >
                    {lead.lead_type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Buyer demand intelligence */}
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
                        {" \u00b7 "}
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
