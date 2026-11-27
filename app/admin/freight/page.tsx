import { redirect } from "next/navigation";
import { requireAdmin, sessionClient } from "@/lib/supabase-server";
import AdminShell, { Panel } from "@/components/admin/Shell";
import { respondToPrice, reviewEvent } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Freight: prices to settle, and carrier updates waiting to reach the buyer.
 *
 * Two queues in one page because they are the same job. A carrier who has
 * priced a load and a carrier who has reported a delivery are both waiting
 * on somebody here, and splitting them across two screens means one of them
 * gets forgotten.
 *
 * The held queue matters more than it looks. A pending "delivered" is an
 * order that cannot complete and a supplier who is not getting paid, so an
 * empty queue here is the normal state and a full one is a backlog.
 */

const NOTICE: Record<string, { text: string; tone: string }> = {
  priceagreed: {
    text: "Agreed. The price is now on the shipment and the carrier can move.",
    tone: "border-[#2FA36B]/30 bg-[#2FA36B]/10 text-[#4CC98D]",
  },
  countersent: {
    text: "Counter sent. It is with the carrier now.",
    tone: "border-[#2FA36B]/30 bg-[#2FA36B]/10 text-[#4CC98D]",
  },
  pricerejected: {
    text: "Rejected. Nothing is agreed and the carrier can send another figure.",
    tone: "border-gold/30 bg-gold/10 text-gold",
  },
  eventapproved: {
    text: "Approved. The buyer can see it, and the shipment has moved.",
    tone: "border-[#2FA36B]/30 bg-[#2FA36B]/10 text-[#4CC98D]",
  },
  eventrejected: {
    text: "Rejected. The buyer will not see it and nothing has changed.",
    tone: "border-gold/30 bg-gold/10 text-gold",
  },
  badcounter: {
    text: "A counter needs a figure.",
    tone: "border-[#C2453F]/30 bg-[#C2453F]/10 text-[#E58B85]",
  },
  pricefailed: {
    text: "Could not save that. It may already have been settled by someone else.",
    tone: "border-[#C2453F]/30 bg-[#C2453F]/10 text-[#E58B85]",
  },
  reviewfailed: {
    text: "Could not save that. It may already have been reviewed.",
    tone: "border-[#C2453F]/30 bg-[#C2453F]/10 text-[#E58B85]",
  },
};

interface OpenProposal {
  id: string;
  shipment_id: string;
  proposed_by: string;
  amount_minor: number;
  currency: string;
  chargeable_weight_kg: number | null;
  note: string | null;
  created_at: string;
  carriers: { name: string } | { name: string }[] | null;
  shipments: { reference: string } | { reference: string }[] | null;
}

interface HeldEvent {
  id: string;
  shipment_id: string;
  status: string;
  description: string | null;
  location: string | null;
  occurred_at: string;
  shipments:
    | { reference: string; carrier_id: string | null }
    | { reference: string; carrier_id: string | null }[]
    | null;
}

const one = <T,>(v: T | T[] | null): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : v;

const money = (minor: number, currency: string) =>
  `${currency} ${(minor / 100).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const HELD_REASON: Record<string, string> = {
  delivered: "Starts the 7 day release clock",
  exception: "Will alarm the buyer",
  cancelled: "Ends the job",
};

export default async function AdminFreightPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { done } = await searchParams;
  const notice = done ? NOTICE[done] : null;

  const supabase = await sessionClient();

  const [{ data: priceRows }, { data: eventRows }] = await Promise.all([
    supabase
      .from("freight_proposals")
      .select(
        "id, shipment_id, proposed_by, amount_minor, currency, " +
          "chargeable_weight_kg, note, created_at, " +
          "carriers:carrier_id ( name ), shipments:shipment_id ( reference )"
      )
      .eq("status", "open")
      .eq("proposed_by", "carrier")
      .order("created_at", { ascending: true }),
    supabase
      .from("shipment_events")
      .select(
        "id, shipment_id, status, description, location, occurred_at, " +
          "shipments:shipment_id ( reference, carrier_id )"
      )
      .eq("approval_state", "pending")
      .eq("source", "carrier")
      .order("occurred_at", { ascending: true }),
  ]);

  const prices = (priceRows ?? []) as unknown as OpenProposal[];
  const held = (eventRows ?? []) as unknown as HeldEvent[];

  return (
    <AdminShell
      admin={admin}
      title="Freight"
      subtitle="Prices to settle, and carrier updates waiting to reach the buyer."
    >
      {notice ? (
        <p className={`mb-6 rounded-lg border px-4 py-3 text-sm ${notice.tone}`}>
          {notice.text}
        </p>
      ) : null}

      <Panel
        title="Prices waiting on you"
        action={
          prices.length > 0 ? (
            <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-bold text-gold">
              {prices.length} open
            </span>
          ) : null
        }
      >
        {prices.length === 0 ? (
          <p className="px-6 py-8 text-sm text-white/50">
            No carrier is waiting on a price.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.055]">
            {prices.map((p) => {
              const carrier = one(p.carriers)?.name ?? "Unknown carrier";
              const ref = one(p.shipments)?.reference ?? p.shipment_id.slice(0, 8);
              const respond = respondToPrice.bind(null, p.id);
              return (
                <li key={p.id} className="px-6 py-5">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="font-mono text-[13.5px] font-bold text-white">
                      {ref}
                    </span>
                    <span className="text-sm text-white/70">{carrier}</span>
                    <span className="ml-auto text-lg font-extrabold text-white">
                      {money(p.amount_minor, p.currency)}
                    </span>
                  </div>

                  <div className="mt-1 text-[12px] text-white/45">
                    {when(p.created_at)}
                    {p.chargeable_weight_kg
                      ? ` · they make it ${p.chargeable_weight_kg} kg chargeable`
                      : ""}
                  </div>

                  {p.note ? (
                    <p className="mt-2 text-[13px] leading-relaxed text-white/70">
                      {p.note}
                    </p>
                  ) : null}

                  <form
                    action={respond}
                    className="mt-4 flex flex-wrap items-end gap-3"
                  >
                    <label className="block">
                      <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/40">
                        Counter with
                      </span>
                      <input
                        name="counter"
                        inputMode="decimal"
                        placeholder="1820.00"
                        className="mt-2 w-32 rounded-lg border border-white/12 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-gold"
                      />
                    </label>
                    <label className="block grow">
                      <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/40">
                        Note to the carrier
                      </span>
                      <input
                        name="note"
                        placeholder="Our rate on this lane is 3.80 a kilo."
                        className="mt-2 w-full rounded-lg border border-white/12 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-gold"
                      />
                    </label>

                    <button
                      type="submit"
                      name="action"
                      value="accept"
                      className="rounded-lg bg-gold px-4 py-2 text-[12.5px] font-extrabold text-[#04281a]"
                    >
                      Accept
                    </button>
                    <button
                      type="submit"
                      name="action"
                      value="counter"
                      className="rounded-lg border border-white/16 px-4 py-2 text-[12.5px] font-bold text-white/75"
                    >
                      Counter
                    </button>
                    <button
                      type="submit"
                      name="action"
                      value="reject"
                      className="rounded-lg border border-white/16 px-4 py-2 text-[12.5px] font-bold text-white/75"
                    >
                      Reject
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div className="h-6" />

      <Panel
        title="Updates held from the buyer"
        action={
          held.length > 0 ? (
            <span className="rounded-full bg-[#C2453F]/16 px-2.5 py-0.5 text-[11px] font-bold text-[#E58B85]">
              {held.length} waiting
            </span>
          ) : null
        }
      >
        {held.length === 0 ? (
          <p className="px-6 py-8 text-sm text-white/50">
            Nothing held. Collected, in transit, at customs and out for delivery
            go straight through without reaching this queue.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.055]">
            {held.map((e) => {
              const ref = one(e.shipments)?.reference ?? e.shipment_id.slice(0, 8);
              const approve = reviewEvent.bind(null, e.id, true);
              const reject = reviewEvent.bind(null, e.id, false);
              return (
                <li key={e.id} className="px-6 py-5">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="font-mono text-[13.5px] font-bold text-white">
                      {ref}
                    </span>
                    <span className="rounded-full bg-[#C2453F]/16 px-2.5 py-0.5 text-[11.5px] font-extrabold text-[#E58B85]">
                      {e.status}
                    </span>
                    <span className="ml-auto text-[12px] text-white/45">
                      {HELD_REASON[e.status] ?? "Held for review"}
                    </span>
                  </div>

                  {e.description ? (
                    <p className="mt-2 text-[13px] leading-relaxed text-white/70">
                      {e.description}
                    </p>
                  ) : null}
                  <div className="mt-1 text-[12px] text-white/45">
                    {when(e.occurred_at)}
                    {e.location ? ` at ${e.location}` : ""}
                  </div>

                  <div className="mt-4 flex flex-wrap items-end gap-3">
                    <form action={approve}>
                      <button
                        type="submit"
                        className="rounded-lg bg-gold px-4 py-2 text-[12.5px] font-extrabold text-[#04281a]"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={reject} className="flex items-end gap-3">
                      <label className="block">
                        <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/40">
                          Reason, shown to the carrier
                        </span>
                        <input
                          name="note"
                          placeholder="Resolved in 20 minutes, not worth alarming them."
                          className="mt-2 w-72 rounded-lg border border-white/12 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-gold"
                        />
                      </label>
                      <button
                        type="submit"
                        className="rounded-lg border border-white/16 px-4 py-2 text-[12.5px] font-bold text-white/75"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </AdminShell>
  );
}
