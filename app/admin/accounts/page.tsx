import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import { COUNTRIES } from "@/lib/countries";
import AdminShell, { Panel, StatCard } from "@/components/admin/Shell";

export const dynamic = "force-dynamic";

const COUNTRY = new Map(COUNTRIES.map((c) => [c.code, c.name]));
const DAY = 24 * 60 * 60 * 1000;

interface Person {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  country_code: string | null;
  platform_role: string;
  created_at: string | null;
}

export default async function AdminAccountsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  /**
   * Accounts, as distinct from leads.
   *
   * Everything else in this area reads the leads table, which is the
   * marketing capture form. These are people who created a real account
   * with a password and confirmed their address, and until now they did not
   * appear anywhere in administration at all.
   */
  const svc = serviceClient();

  const { data } = await svc
    .from("profiles")
    .select(
      "id, email, full_name, first_name, last_name, phone, country_code, platform_role, created_at"
    )
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(500);

  const people = (data ?? []) as Person[];

  // How many companies each one belongs to, so you can see at a glance who
  // signed up and then stopped.
  const { data: memberRows } = await svc
    .from("company_members")
    .select("user_id, member_role")
    .eq("status", "active");

  const companyCount = new Map<string, number>();
  for (const r of (memberRows ?? []) as { user_id: string }[]) {
    companyCount.set(r.user_id, (companyCount.get(r.user_id) ?? 0) + 1);
  }

  const withCompany = people.filter((p) => (companyCount.get(p.id) ?? 0) > 0).length;
  const stalled = people.length - withCompany;
  const thisWeek = people.filter(
    (p) => p.created_at && Date.now() - new Date(p.created_at).getTime() < 7 * DAY
  ).length;

  return (
    <AdminShell
      admin={admin}
      title="Accounts"
      subtitle="People who have signed up and confirmed their email address"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={people.length} label="Accounts" accent="gold" />
        <StatCard value={thisWeek} label="New this week" accent="blue" />
        <StatCard value={withCompany} label="Created a company" accent="green" />
        <StatCard
          value={stalled}
          label="No company yet"
          accent={stalled > 0 ? "red" : "slate"}
          caption={stalled > 0 ? "Signed up and stopped" : undefined}
        />
      </div>

      <div className="mt-6">
        <Panel title="All accounts">
          {people.length === 0 ? (
            <p className="py-12 text-center text-white/45">
              No accounts yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[50rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[0.7rem] tracking-widest text-white/40 uppercase">
                    <th scope="col" className="py-3 pr-4 font-semibold">Joined</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Name</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Email</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Phone</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Country</th>
                    <th scope="col" className="py-3 font-semibold">Companies</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => {
                    const count = companyCount.get(p.id) ?? 0;
                    const name =
                      [p.first_name, p.last_name].filter(Boolean).join(" ") ||
                      p.full_name;

                    return (
                      <tr
                        key={p.id}
                        className="border-b border-white/6 align-top transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="tabular py-3.5 pr-4 whitespace-nowrap text-white/45">
                          {p.created_at
                            ? new Date(p.created_at).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "Unknown"}
                        </td>
                        <td className="py-3.5 pr-4 text-white">
                          {name || <span className="text-white/35">Not given</span>}
                          {p.platform_role === "admin" && (
                            <span className="ml-2 rounded bg-gold/15 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-gold uppercase">
                              Admin
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 pr-4">
                          {p.email ? (
                            <a
                              href={`mailto:${p.email}`}
                              className="text-white/70 hover:text-gold"
                            >
                              {p.email}
                            </a>
                          ) : (
                            <span className="text-white/35">None</span>
                          )}
                        </td>
                        <td className="py-3.5 pr-4 text-white/70">
                          {p.phone ?? <span className="text-white/35">Not given</span>}
                        </td>
                        <td className="py-3.5 pr-4 text-white/70">
                          {p.country_code
                            ? (COUNTRY.get(p.country_code) ?? p.country_code)
                            : <span className="text-white/35">Not set</span>}
                        </td>
                        <td className="py-3.5">
                          {count === 0 ? (
                            <span className="text-white/35">None yet</span>
                          ) : (
                            <span className="text-white/70">{count}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}
