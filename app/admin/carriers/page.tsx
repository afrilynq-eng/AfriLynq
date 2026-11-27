import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import AdminShell, { Panel } from "@/components/admin/Shell";
import { TableWrap, Th, Td, Empty } from "@/components/admin/Money";
import { describeLanes } from "@/lib/shipments";
import { addCarrier, setCarrierActive } from "../shipments/actions";

export const dynamic = "force-dynamic";

/**
 * The carrier registry.
 *
 * AfriLynq works with several logistics companies rather than one
 * partner, which was the decision of 15 November, so this is a list
 * somebody maintains rather than a constant in the code. Adding a carrier
 * is a form, not a deploy.
 *
 * Three ways status reaches us, and the first will be the common one for
 * a long time:
 *
 *   manual  somebody here types what the carrier told them
 *   push    the carrier posts to our endpoint with a shared secret
 *   api     we poll them, which nobody is doing yet
 *
 * Building for manual first is not a compromise. Most freight forwarders
 * moving goods out of Lagos do not have an API, and a platform that
 * assumed one would simply not work with them.
 */

const NOTICE: Record<string, { text: string; tone: string }> = {
  added: {
    text: "Added. If it pushes status to us, the secret is below. Send it to them over something other than email.",
    tone: "border-[#2FA36B]/30 bg-[#2FA36B]/10 text-[#4CC98D]",
  },
  updated: { text: "Updated.", tone: "border-[#2FA36B]/30 bg-[#2FA36B]/10 text-[#4CC98D]" },
  duplicate: {
    text: "A carrier with that short name already exists. Give this one a different one.",
    tone: "border-gold/30 bg-gold/10 text-gold",
  },
  noname: {
    text: "A carrier needs a name.",
    tone: "border-[#C2453F]/30 bg-[#C2453F]/10 text-[#E58B85]",
  },
  error: {
    text: "Could not save that. The reason is in the server log.",
    tone: "border-[#C2453F]/30 bg-[#C2453F]/10 text-[#E58B85]",
  },
};

export default async function AdminCarriersPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { done } = await searchParams;
  const svc = serviceClient();

  const [{ data }, { data: counts }] = await Promise.all([
    svc.from("carriers").select("*").order("active", { ascending: false }).order("name"),
    svc.from("shipments").select("carrier_id"),
  ]);

  const carriers = (data ?? []) as unknown as {
    id: string;
    name: string;
    slug: string;
    integration: string;
    push_secret: string | null;
    origin_countries: string[] | null;
    destination_countries: string[] | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    website: string | null;
    notes: string | null;
    active: boolean;
  }[];

  const used = new Map<string, number>();
  for (const s of (counts ?? []) as { carrier_id: string | null }[]) {
    if (!s.carrier_id) continue;
    used.set(s.carrier_id, (used.get(s.carrier_id) ?? 0) + 1);
  }

  const notice = done ? NOTICE[done] : null;

  return (
    <AdminShell admin={admin} title="Carriers" subtitle="Who moves the goods, and how they tell us">
      {notice && (
        <p className={`mb-6 rounded-xl border px-4 py-3 text-sm ${notice.tone}`}>{notice.text}</p>
      )}

      <Panel
        title="Who you work with"
        action={
          <Link
            href="/admin/carriers/logins"
            className="text-[12px] font-bold text-gold hover:underline"
          >
            Carrier logins
          </Link>
        }
      >
        {carriers.length === 0 ? (
          <Empty>
            No carriers yet. Add one below and you can start booking shipments against paid
            orders.
          </Empty>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Carrier</Th>
                <Th>Lanes</Th>
                <Th>How status reaches us</Th>
                <Th>Contact</Th>
                <Th right>Shipments</Th>
              </tr>
            </thead>
            <tbody>
              {carriers.map((c) => (
                <tr key={c.id}>
                  <Td>
                    <span className="font-semibold text-white">{c.name}</span>
                    {!c.active && (
                      <span className="ml-2 rounded bg-white/8 px-2 py-0.5 text-[0.65rem] text-white/45">
                        Not in use
                      </span>
                    )}
                    {c.website && (
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-0.5 block text-xs text-gold hover:underline"
                      >
                        {c.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </Td>
                  <Td muted>
                    <span className="text-xs">
                      {describeLanes(c.origin_countries, c.destination_countries)}
                    </span>
                  </Td>
                  <Td muted>
                    <span className="text-xs">
                      {c.integration === "manual"
                        ? "Typed in here"
                        : c.integration === "push"
                          ? "They post to us"
                          : "We poll them"}
                    </span>
                    {c.integration === "push" && c.push_secret && (
                      <details className="mt-1">
                        <summary className="cursor-pointer list-none text-xs text-gold hover:underline">
                          Show their secret
                        </summary>
                        <code className="tabular mt-1 block break-all rounded bg-black/30 px-2 py-1.5 text-[0.65rem] text-white/70">
                          {c.push_secret}
                        </code>
                        <span className="mt-1 block text-[0.65rem] text-white/35">
                          They send this as the X-Carrier-Secret header.
                        </span>
                      </details>
                    )}
                  </Td>
                  <Td muted>
                    <span className="block text-xs">{c.contact_name}</span>
                    {c.contact_email && (
                      <span className="block text-xs text-white/35">{c.contact_email}</span>
                    )}
                    {c.contact_phone && (
                      <span className="tabular block text-xs text-white/35">{c.contact_phone}</span>
                    )}
                  </Td>
                  <Td right muted>
                    <span className="tabular">{used.get(c.id) ?? 0}</span>
                    <form action={setCarrierActive.bind(null, c.id, !c.active)} className="mt-1.5">
                      <button
                        type="submit"
                        className="rounded-lg border border-white/15 px-2.5 py-1 text-[0.68rem] font-medium text-white/70 hover:bg-white/8"
                      >
                        {c.active ? "Stop using" : "Use again"}
                      </button>
                    </form>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>

      <div className="mt-6">
        <Panel title="Add a carrier">
          <form action={addCarrier} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name" hint="As they write it">
              <input name="name" required className={inputClass} placeholder="Sprint Africa" />
            </Field>
            <Field label="Short name" hint="Leave blank and one is made from the name">
              <input name="slug" className={inputClass} placeholder="sprint-africa" />
            </Field>
            <Field label="How status reaches us">
              <select name="integration" defaultValue="manual" className={inputClass}>
                <option value="manual">Typed in here</option>
                <option value="push">They post to us</option>
                <option value="api">We poll them</option>
              </select>
            </Field>

            <Field label="Collects from" hint="Two letter codes, comma separated. Blank means anywhere.">
              <input name="origin_countries" className={inputClass} placeholder="NG, ZM, TG" />
            </Field>
            <Field label="Delivers to" hint="Blank means anywhere">
              <input name="destination_countries" className={inputClass} placeholder="GB" />
            </Field>
            <Field label="Website">
              <input name="website" className={inputClass} placeholder="https://" />
            </Field>

            <Field label="Contact name">
              <input name="contact_name" className={inputClass} />
            </Field>
            <Field label="Contact email">
              <input name="contact_email" type="email" className={inputClass} />
            </Field>
            <Field label="Contact phone">
              <input name="contact_phone" className={inputClass} />
            </Field>

            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Notes" hint="Rates, lead times, what they will and will not carry">
                <input name="notes" className={inputClass} />
              </Field>
            </div>

            <div>
              <button
                type="submit"
                className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-[#042115]"
              >
                Add carrier
              </button>
            </div>
          </form>

          <p className="mt-5 border-t border-white/8 pt-4 text-xs leading-relaxed text-white/35">
            Choosing &ldquo;they post to us&rdquo; generates a secret for that carrier, shown
            in the table above once saved. It is generated rather than chosen, because a
            shared secret somebody picks is a shared secret somebody guesses. Send it to them
            over something other than the email account it protects.
          </p>
        </Panel>
      </div>
    </AdminShell>
  );
}

const inputClass =
  "w-full rounded-lg bg-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-white/25";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[0.68rem] font-semibold tracking-widest text-white/40 uppercase">
        {label}
      </span>
      {hint && <span className="mt-0.5 block text-xs text-white/30">{hint}</span>}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}
