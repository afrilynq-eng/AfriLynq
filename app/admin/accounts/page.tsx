import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import { COUNTRIES } from "@/lib/countries";
import AdminShell, { Panel, StatCard } from "@/components/admin/Shell";

export const dynamic = "force-dynamic";

const COUNTRY = new Map(COUNTRIES.map((c) => [c.code, c.name]));
const DAY = 24 * 60 * 60 * 1000;

/**
 * Accounts, as distinct from leads.
 *
 * A lead filled in the marketing form. These are people who created a
 * real account with a password, and since the role-specific sign-up went
 * in they also told us which side of the market they are on. That is the
 * column this page existed to show and could not.
 *
 * Whether the email was ever confirmed, and when somebody last signed in,
 * live in auth.users rather than profiles. They are not reachable through
 * PostgREST, so they come from the auth admin API, which the service role
 * key allows. Somebody who signed up and never confirmed is invisible
 * otherwise, and they are the most interesting rows on the page.
 */

interface Person {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  country_code: string | null;
  platform_role: string;
  account_type: string | null;
  created_at: string | null;
}

const ROLE_CHIP: Record<string, string> = {
  supplier: "bg-gold/20 text-gold",
  buyer: "bg-[#2FA36B]/20 text-[#4CC98D]",
  shopper: "bg-[#3B82F6]/20 text-[#7CADFA]",
  both: "bg-[#A78BFA]/20 text-[#C4B1FC]",
};
const ROLE_LABEL: Record<string, string> = {
  supplier: "Supplier",
  buyer: "Retailer",
  shopper: "Shopper",
  both: "Both",
};

const TABS = [
  { value: "", label: "All" },
  { value: "supplier", label: "Suppliers" },
  { value: "buyer", label: "Retailers" },
  { value: "shopper", label: "Shoppers" },
  { value: "both", label: "Both" },
  { value: "unconfirmed", label: "Email not confirmed" },
];

function day(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function lastSeen(iso: string | null) {
  if (!iso) return "Never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return day(iso) ?? "Never";
}

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { q, role } = await searchParams;
  const svc = serviceClient();

  const [{ data }, { data: memberRows }, authRes] = await Promise.all([
    svc
      .from("profiles")
      .select(
        "id, email, full_name, first_name, last_name, phone, country_code, platform_role, account_type, created_at"
      )
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(1000),
    svc.from("company_members").select("user_id").eq("status", "active"),
    // One page of a thousand. If AfriLynq ever passes that, this needs
    // paging rather than a bigger number, and the count below will be the
    // thing that looks wrong first.
    svc.auth.admin
      .listUsers({ page: 1, perPage: 1000 })
      .catch(() => ({ data: { users: [] } })),
  ]);

  const people = (data ?? []) as Person[];

  const companyCount = new Map<string, number>();
  for (const r of (memberRows ?? []) as { user_id: string }[]) {
    companyCount.set(r.user_id, (companyCount.get(r.user_id) ?? 0) + 1);
  }

  // Confirmation and last sign-in, keyed by account id.
  const authById = new Map<string, { confirmed: boolean; lastSignIn: string | null }>();
  for (const u of (authRes?.data?.users ?? []) as {
    id: string;
    email_confirmed_at?: string | null;
    confirmed_at?: string | null;
    last_sign_in_at?: string | null;
  }[]) {
    authById.set(u.id, {
      confirmed: Boolean(u.email_confirmed_at ?? u.confirmed_at),
      lastSignIn: u.last_sign_in_at ?? null,
    });
  }
  // If the auth call failed we know nothing, and claiming everyone is
  // unconfirmed would be worse than saying so.
  const authKnown = authById.size > 0;

  const thisWeek = people.filter(
    (p) => p.created_at && Date.now() - new Date(p.created_at).getTime() < 7 * DAY
  ).length;
  const unconfirmed = authKnown
    ? people.filter((p) => authById.get(p.id) && !authById.get(p.id)!.confirmed).length
    : 0;
  const noCompany = people.filter((p) => (companyCount.get(p.id) ?? 0) === 0).length;

  const needle = (q ?? "").trim().toLowerCase();
  const shown = people.filter((p) => {
    if (role === "unconfirmed") {
      if (!authKnown || authById.get(p.id)?.confirmed !== false) return false;
    } else if (role && p.account_type !== role) {
      return false;
    }
    if (!needle) return true;
    const name = [p.first_name, p.last_name, p.full_name].filter(Boolean).join(" ");
    return `${name} ${p.email ?? ""}`.toLowerCase().includes(needle);
  });

  const href = (value: string) =>
    value
      ? `/admin/accounts?role=${value}${needle ? `&q=${encodeURIComponent(needle)}` : ""}`
      : `/admin/accounts${needle ? `?q=${encodeURIComponent(needle)}` : ""}`;

  return (
    <AdminShell
      admin={admin}
      title="Accounts"
      subtitle="People who have signed up, with the role each one chose"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={people.length} label="Accounts" accent="gold" />
        <StatCard
          value={thisWeek}
          label="New this week"
          accent="blue"
          caption={thisWeek === 0 ? "none this week" : undefined}
        />
        <StatCard
          value={unconfirmed}
          label="Email not confirmed"
          accent={unconfirmed > 0 ? "red" : "slate"}
          caption={
            !authKnown
              ? "could not read sign-in records"
              : unconfirmed > 0
                ? "signed up and stopped"
                : "everyone confirmed"
          }
        />
        <StatCard
          value={noCompany}
          label="No company yet"
          accent={noCompany > 0 ? "slate" : "green"}
          caption="shoppers never need one"
        />
      </div>

      <div className="mt-6">
        <Panel title="All accounts">
          <div className="flex flex-wrap items-center gap-4">
            <nav className="flex flex-wrap gap-1" aria-label="Filter by role">
              {TABS.map((t) => {
                const active = (role ?? "") === t.value;
                return (
                  <Link
                    key={t.label}
                    href={href(t.value)}
                    className={
                      "rounded px-3.5 py-2 text-sm transition-colors " +
                      (active
                        ? "bg-white/14 text-white"
                        : "text-white/55 hover:bg-white/6 hover:text-white")
                    }
                  >
                    {t.label}
                  </Link>
                );
              })}
            </nav>

            <form className="ml-auto flex gap-2" action="/admin/accounts">
              {role && <input type="hidden" name="role" value={role} />}
              <label htmlFor="q" className="sr-only">
                Search accounts
              </label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={q ?? ""}
                placeholder="Search name or email"
                className="w-56 rounded bg-white/[0.06] px-3.5 py-2 text-sm text-white ring-1 ring-white/10 placeholder:text-white/35"
              />
              <button
                type="submit"
                className="rounded bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/16"
              >
                Search
              </button>
            </form>
          </div>

          {shown.length === 0 ? (
            <p className="py-12 text-center text-white/45">
              {people.length === 0
                ? "No accounts yet."
                : "No accounts match that filter."}
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[58rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[0.7rem] tracking-widest text-white/40 uppercase">
                    <th scope="col" className="py-3 pr-4 font-semibold">Joined</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Name</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Email</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Role</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Country</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Companies</th>
                    <th scope="col" className="py-3 pr-4 font-semibold">Confirmed</th>
                    <th scope="col" className="py-3 font-semibold">Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((p) => {
                    const count = companyCount.get(p.id) ?? 0;
                    const name =
                      [p.first_name, p.last_name].filter(Boolean).join(" ") ||
                      p.full_name;
                    const a = authById.get(p.id);

                    return (
                      <tr
                        key={p.id}
                        className="border-b border-white/6 align-top transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="tabular py-3.5 pr-4 whitespace-nowrap text-white/45">
                          {day(p.created_at) ?? "Unknown"}
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
                        <td className="py-3.5 pr-4">
                          {p.account_type ? (
                            <span
                              className={
                                "rounded px-2.5 py-1 text-xs font-medium " +
                                (ROLE_CHIP[p.account_type] ?? "bg-white/10 text-white/60")
                              }
                            >
                              {ROLE_LABEL[p.account_type] ?? p.account_type}
                            </span>
                          ) : (
                            <span className="text-white/35">Not asked</span>
                          )}
                        </td>
                        <td className="py-3.5 pr-4 text-white/70">
                          {p.country_code ? (
                            (COUNTRY.get(p.country_code) ?? p.country_code)
                          ) : (
                            <span className="text-white/35">Not set</span>
                          )}
                        </td>
                        <td className="tabular py-3.5 pr-4">
                          {count === 0 ? (
                            <span className="text-white/35">None</span>
                          ) : (
                            <span className="text-white/70">{count}</span>
                          )}
                        </td>
                        <td className="py-3.5 pr-4">
                          {!authKnown || !a ? (
                            <span className="text-white/30">Unknown</span>
                          ) : a.confirmed ? (
                            <span className="rounded bg-[#2FA36B]/20 px-2.5 py-1 text-xs text-[#4CC98D]">
                              Confirmed
                            </span>
                          ) : (
                            <span className="rounded bg-[#C2453F]/25 px-2.5 py-1 text-xs text-[#F0918C]">
                              Not confirmed
                            </span>
                          )}
                        </td>
                        <td className="tabular py-3.5 whitespace-nowrap text-white/55">
                          {authKnown && a ? lastSeen(a.lastSignIn) : "Unknown"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-xs text-white/35">
            Accounts with no role signed up before the question was asked, or
            through Google or Microsoft, which do not send it.
          </p>
        </Panel>
      </div>
    </AdminShell>
  );
}
