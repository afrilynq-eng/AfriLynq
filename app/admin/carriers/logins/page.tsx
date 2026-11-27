import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import AdminShell, { Panel } from "@/components/admin/Shell";
import { SITE_URL } from "@/lib/site";
import { createCarrierLogin, setLoginActive, resetCarrierPassword } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Who at each carrier can sign in.
 *
 * The portal has no sign-up. A haulier gets an account because somebody here
 * made them one, which is the right way round for a partner tool: there is no
 * public door to defend.
 */

const NOTICE: Record<string, { text: string; tone: string }> = {
  created: {
    text: "Account created. The password is below and will not be shown again.",
    tone: "border-[#2FA36B]/30 bg-[#2FA36B]/10 text-[#4CC98D]",
  },
  linked: {
    text: "That email already had an account, so it has been linked rather than recreated. They sign in with the password they already have.",
    tone: "border-[#2FA36B]/30 bg-[#2FA36B]/10 text-[#4CC98D]",
  },
  reset: {
    text: "New password set. It is below and will not be shown again.",
    tone: "border-gold/30 bg-gold/10 text-gold",
  },
  withdrawn: {
    text: "Access withdrawn. They can no longer see any job.",
    tone: "border-gold/30 bg-gold/10 text-gold",
  },
  reinstated: {
    text: "Access restored.",
    tone: "border-[#2FA36B]/30 bg-[#2FA36B]/10 text-[#4CC98D]",
  },
  alreadylinked: {
    text: "That person already acts for a carrier. One login works for one carrier, so use a different email address.",
    tone: "border-gold/30 bg-gold/10 text-gold",
  },
  bademail: {
    text: "That does not look like an email address.",
    tone: "border-[#C2453F]/30 bg-[#C2453F]/10 text-[#E58B85]",
  },
  nocarrier: {
    text: "Choose which carrier this person works for.",
    tone: "border-[#C2453F]/30 bg-[#C2453F]/10 text-[#E58B85]",
  },
  createfailed: {
    text: "Could not create that account. The reason is in the server log.",
    tone: "border-[#C2453F]/30 bg-[#C2453F]/10 text-[#E58B85]",
  },
  linkfailed: {
    text: "The account exists but could not be linked to that carrier.",
    tone: "border-[#C2453F]/30 bg-[#C2453F]/10 text-[#E58B85]",
  },
  resetfailed: {
    text: "Could not reset that password.",
    tone: "border-[#C2453F]/30 bg-[#C2453F]/10 text-[#E58B85]",
  },
  updatefailed: {
    text: "Could not change that.",
    tone: "border-[#C2453F]/30 bg-[#C2453F]/10 text-[#E58B85]",
  },
};

const inputClass =
  "mt-2 w-full rounded-lg border border-white/12 bg-white/[0.05] px-3.5 py-2.5 " +
  "text-sm text-white outline-none placeholder:text-white/25 focus:border-gold";

const labelClass =
  "text-[10px] font-bold uppercase tracking-[0.13em] text-white/40";

export default async function CarrierLoginsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; pw?: string; em?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { done, pw, em } = await searchParams;
  const notice = done ? NOTICE[done] : null;

  const svc = serviceClient();

  const [{ data: carrierRows }, { data: linkRows }] = await Promise.all([
    svc.from("carriers").select("id, name, active").order("name"),
    svc
      .from("carrier_users")
      .select("id, carrier_id, user_id, role_title, active, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const carriers = (carrierRows ?? []) as { id: string; name: string; active: boolean }[];
  const links = (linkRows ?? []) as {
    id: string;
    carrier_id: string;
    user_id: string;
    role_title: string | null;
    active: boolean;
    created_at: string;
  }[];

  // Emails live on profiles, not on the link row.
  const { data: profileRows } = links.length
    ? await svc.from("profiles").select("id, email, full_name").in("id", links.map((l) => l.user_id))
    : { data: [] };

  const profiles = new Map(
    ((profileRows ?? []) as { id: string; email: string; full_name: string | null }[]).map(
      (p) => [p.id, p]
    )
  );
  const carrierName = new Map(carriers.map((c) => [c.id, c.name]));

  return (
    <AdminShell
      admin={admin}
      title="Carrier logins"
      subtitle="Who at each carrier can sign in to the portal"
    >
      {notice ? (
        <p className={`mb-6 rounded-xl border px-4 py-3 text-sm ${notice.tone}`}>
          {notice.text}
        </p>
      ) : null}

      {pw ? (
        <div className="mb-6 rounded-xl border border-gold/40 bg-gold/10 p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-gold">
            Send these to them now
          </div>
          <div className="mt-3 grid gap-2 font-mono text-[15px] text-white">
            <div>
              <span className="text-white/45">Address&nbsp;&nbsp;</span>
              {SITE_URL}/carrier
            </div>
            <div>
              <span className="text-white/45">Email&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
              {em}
            </div>
            <div>
              <span className="text-white/45">Password&nbsp;&nbsp;</span>
              <b className="text-gold">{pw}</b>
            </div>
          </div>
          <p className="mt-4 text-[12.5px] leading-relaxed text-white/60">
            This password is not stored anywhere and will not be shown again. Send it over
            WhatsApp or read it to them, not by email, and leave this page only once you
            have. If it is lost, use Reset password below.
          </p>
        </div>
      ) : null}

      <Panel
        title="Who can sign in"
        action={
          <Link href="/admin/carriers" className="text-[12px] font-bold text-gold hover:underline">
            Back to carriers
          </Link>
        }
      >
        {links.length === 0 ? (
          <p className="py-6 text-sm text-white/50">
            Nobody yet. Until somebody is added here, the carrier portal has no users and
            the address does nothing.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.055]">
            {links.map((l) => {
              const profile = profiles.get(l.user_id);
              const toggle = setLoginActive.bind(null, l.id, !l.active);
              const reset = resetCarrierPassword.bind(null, l.user_id);
              return (
                <li key={l.id} className="flex flex-wrap items-center gap-3 py-4">
                  <div className="min-w-0 grow">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-sm font-bold text-white">
                        {profile?.email ?? "Unknown address"}
                      </span>
                      {l.active ? (
                        <span className="rounded-full bg-[#2FA36B]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#4CC98D]">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-[11px] font-bold text-white/55">
                          Withdrawn
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[12.5px] text-white/50">
                      {carrierName.get(l.carrier_id) ?? "Unknown carrier"}
                      {l.role_title ? ` · ${l.role_title}` : ""}
                    </div>
                  </div>

                  <form action={reset}>
                    <button
                      type="submit"
                      className="rounded-lg border border-white/16 px-3.5 py-2 text-[12px] font-bold text-white/75"
                    >
                      Reset password
                    </button>
                  </form>
                  <form action={toggle}>
                    <button
                      type="submit"
                      className="rounded-lg border border-white/16 px-3.5 py-2 text-[12px] font-bold text-white/75"
                    >
                      {l.active ? "Withdraw access" : "Restore access"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div className="mt-6">
        <Panel title="Add a login">
          <form action={createCarrierLogin} className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={labelClass}>Carrier</span>
              <select name="carrier_id" required className={inputClass} defaultValue="">
                <option value="" disabled>
                  Choose one
                </option>
                {carriers
                  .filter((c) => c.active)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="block">
              <span className={labelClass}>Their email</span>
              <input
                name="email"
                type="email"
                required
                placeholder="ops@sahelfreight.ng"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Their role</span>
              <input
                name="role_title"
                placeholder="Operations manager"
                className={inputClass}
              />
            </label>

            <div className="sm:col-span-3">
              <button
                type="submit"
                className="rounded-lg bg-gold px-4 py-2.5 text-[13px] font-extrabold text-[#04281a]"
              >
                Create the login
              </button>
              <p className="mt-3 text-[12.5px] leading-relaxed text-white/50">
                A password is generated and shown to you once. Nothing is emailed to them,
                so send it over WhatsApp as you already do with the push secret. They see
                only the jobs assigned to their own carrier, and nothing else on the
                platform.
              </p>
            </div>
          </form>
        </Panel>
      </div>
    </AdminShell>
  );
}
