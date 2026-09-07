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
  created_at: string;
};

const NAMES = new Map(CATEGORIES.map((c) => [c.slug, c.name]));

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const supabase = await sessionClient();
  const { data } = await supabase
    .from("leads")
    .select("id, lead_type, full_name, email, company_name, country_code, categories_of_interest, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  const leads = (data ?? []) as Lead[];

  const buyers = leads.filter((l) => l.lead_type === "buyer").length;
  const suppliers = leads.filter((l) => l.lead_type === "supplier").length;
  const others = leads.filter((l) => l.lead_type === "other").length;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = leads.filter((l) => new Date(l.created_at).getTime() > weekAgo).length;

  // Last six weeks, oldest first.
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const end = Date.now() - i * 7 * 24 * 60 * 60 * 1000;
    const start = end - 7 * 24 * 60 * 60 * 1000;
    const count = leads.filter((l) => {
      const t = new Date(l.created_at).getTime();
      return t > start && t <= end;
    }).length;
    return { label: i === 0 ? "This wk" : `-${i}wk`, value: count };
  }).reverse();

  // Which categories people are actually asking about.
  const interest = new Map<string, number>();
  for (const lead of leads) {
    for (const slug of lead.categories_of_interest ?? []) {
      interest.set(slug, (interest.get(slug) ?? 0) + 1);
    }
  }
  const topCategories = [...interest.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxInterest = Math.max(1, ...topCategories.map(([, n]) => n));

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
        <StatCard value={thisWeek} label="This week" caption="last seven days" accent="slate" />
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

        <Panel title="What people are asking for">
          {topCategories.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">
              No category interest recorded yet.
            </p>
          ) : (
            <ul className="space-y-3.5">
              {topCategories.map(([slug, count]) => (
                <li key={slug}>
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-white/75">{NAMES.get(slug) ?? slug}</span>
                    <span className="tabular text-white">{count}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-gold"
                      style={{ width: `${(count / maxInterest) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}
