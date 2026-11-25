import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import AdminShell, { Panel } from "@/components/admin/Shell";
import { MoneyCard, TableWrap, Th, Td, Empty } from "@/components/admin/Money";
import { formatMinor } from "@/lib/money";
import { SERVICE_CHARGE_DISPUTE_PERCENT, SERVICE_CHARGE_PERCENT } from "@/lib/fees";
import { sumByCurrency, formatTotals, minorUnitsMap, shortDate } from "@/lib/admin-money";
import { resolveDispute } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Dispute handling.
 *
 * The screen exists to make one decision: how much of the buyer's money
 * goes back. Everything else follows from that single number, which is
 * why it is the only field on the form. An administrator who could type
 * both the refund and the release could make them disagree, and the
 * database would then be holding two contradictory versions of the same
 * settlement.
 *
 * The charge on what remains is 3.5 percent rather than 7, which is the
 * rule Michael set: AfriLynq charges on money that actually reaches the
 * supplier, at half the usual rate.
 */

const NOTICE: Record<string, { text: string; tone: string }> = {
  ok: {
    text: "Settled. The refund is queued, the supplier's share is approved for release, and both sides can see the outcome on their order.",
    tone: "border-[#2FA36B]/30 bg-[#2FA36B]/10 text-[#4CC98D]",
  },
  already: {
    text: "That dispute had already been settled. Nothing was changed.",
    tone: "border-gold/30 bg-gold/10 text-gold",
  },
  badamount: {
    text: "Enter the refund as a number, for example 400 or 400.00. Enter 0 to release everything to the supplier.",
    tone: "border-[#C2453F]/30 bg-[#C2453F]/10 text-[#E58B85]",
  },
  notadmin: {
    text: "Only a platform administrator can settle a dispute.",
    tone: "border-[#C2453F]/30 bg-[#C2453F]/10 text-[#E58B85]",
  },
  notfound: {
    text: "That dispute no longer exists.",
    tone: "border-[#C2453F]/30 bg-[#C2453F]/10 text-[#E58B85]",
  },
  error: {
    text: "Could not settle it, and nothing was changed. The reason is in the server log.",
    tone: "border-[#C2453F]/30 bg-[#C2453F]/10 text-[#E58B85]",
  },
};

type Dispute = {
  id: string;
  reference: string;
  order_id: string;
  payment_id: string | null;
  raised_by: string;
  raised_side: string;
  reason: string;
  status: string;
  refund_minor: number | null;
  release_minor: number | null;
  commission_minor: number | null;
  currency: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
};

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ settled?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { settled } = await searchParams;
  const svc = serviceClient();

  const [disputesRes, units] = await Promise.all([
    svc
      .from("disputes")
      .select("*")
      .order("status", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(200),
    minorUnitsMap(svc),
  ]);

  const disputes = (disputesRes.data ?? []) as unknown as Dispute[];

  const orderIds = [...new Set(disputes.map((d) => d.order_id))];
  const peopleIds = [...new Set(disputes.map((d) => d.raised_by))];
  const paymentIds = [
    ...new Set(disputes.map((d) => d.payment_id).filter((v): v is string => Boolean(v))),
  ];

  const [ordersRes, peopleRes, paymentsRes, refundsRes] = await Promise.all([
    orderIds.length
      ? svc
          .from("orders")
          .select("id, reference, currency, total_minor, supplier_company_id")
          .in("id", orderIds)
      : Promise.resolve({ data: [] }),
    peopleIds.length
      ? svc.from("profiles").select("id, full_name").in("id", peopleIds)
      : Promise.resolve({ data: [] }),
    paymentIds.length
      ? svc
          .from("payments")
          .select("id, reference, amount_minor, currency")
          .in("id", paymentIds)
      : Promise.resolve({ data: [] }),
    paymentIds.length
      ? svc.from("refunds").select("payment_id, amount_minor, status").in("payment_id", paymentIds)
      : Promise.resolve({ data: [] }),
  ]);

  const orders = new Map(
    ((ordersRes.data ?? []) as unknown as {
      id: string;
      reference: string;
      currency: string;
      total_minor: number;
      supplier_company_id: string;
    }[]).map((o) => [o.id, o] as const)
  );
  const people = new Map(
    ((peopleRes.data ?? []) as { id: string; full_name: string | null }[])
      .map((p) => [p.id, p.full_name || "Someone"] as const)
  );
  const payments = new Map(
    ((paymentsRes.data ?? []) as unknown as {
      id: string;
      reference: string;
      amount_minor: number;
      currency: string;
    }[]).map((p) => [p.id, p] as const)
  );

  // What is still refundable on each payment, which is what the database
  // will check against. Showing a figure the function would then refuse
  // is how an administrator loses trust in the screen.
  const alreadyRefunded = new Map<string, number>();
  for (const r of (refundsRes.data ?? []) as {
    payment_id: string;
    amount_minor: number;
    status: string;
  }[]) {
    if (r.status === "failed") continue;
    alreadyRefunded.set(r.payment_id, (alreadyRefunded.get(r.payment_id) ?? 0) + r.amount_minor);
  }

  const supplierIds = [...new Set([...orders.values()].map((o) => o.supplier_company_id))];
  const { data: companiesRes } = supplierIds.length
    ? await svc.from("companies").select("id, legal_name, trading_name").in("id", supplierIds)
    : { data: [] };
  const companies = new Map(
    ((companiesRes ?? []) as { id: string; legal_name: string; trading_name: string | null }[])
      .map((c) => [c.id, c.trading_name || c.legal_name] as const)
  );

  const open = disputes.filter((d) => d.status === "open");
  const resolved = disputes.filter((d) => d.status === "resolved");

  const atStake = sumByCurrency(
    open.map((d) => {
      const order = orders.get(d.order_id);
      return { currency: order?.currency ?? "GBP", total_minor: order?.total_minor ?? 0 };
    }),
    "total_minor"
  );

  const notice = settled ? NOTICE[settled] : null;

  return (
    <AdminShell
      admin={admin}
      title="Disputes"
      subtitle="Orders where something went wrong, and what was decided"
    >
      {notice && (
        <p className={`mb-6 rounded-xl border px-4 py-3 text-sm ${notice.tone}`}>
          {notice.text}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <MoneyCard
          label="Held pending a decision"
          amounts={formatTotals(atStake, units)}
          caption={
            open.length === 0
              ? "nothing open"
              : `${open.length} ${open.length === 1 ? "dispute" : "disputes"} waiting on you`
          }
          accent={open.length > 0 ? "red" : "slate"}
        />
        <MoneyCard
          label="Returned to buyers"
          amounts={formatTotals(sumByCurrency(resolved, "refund_minor"), units)}
          caption={`across ${resolved.length} settled`}
          accent="blue"
        />
        <MoneyCard
          label="Charge earned on settlements"
          amounts={formatTotals(sumByCurrency(resolved, "commission_minor"), units)}
          caption={`${SERVICE_CHARGE_DISPUTE_PERCENT} percent, half the usual ${SERVICE_CHARGE_PERCENT}`}
          accent="gold"
        />
      </div>

      <div className="mt-6">
        <Panel title="Waiting on a decision">
          {open.length === 0 ? (
            <Empty>
              Nothing open. A dispute appears here the moment a buyer or a supplier raises
              one, and the money on that order stops moving until it is settled.
            </Empty>
          ) : (
            <ul className="space-y-5">
              {open.map((d) => {
                const order = orders.get(d.order_id);
                const payment = d.payment_id ? payments.get(d.payment_id) : undefined;
                const currency = order?.currency ?? "GBP";
                const scale = units[currency] ?? 2;
                const taken = payment?.amount_minor ?? order?.total_minor ?? 0;
                const refundable = taken - (d.payment_id ? (alreadyRefunded.get(d.payment_id) ?? 0) : 0);

                return (
                  <li
                    key={d.id}
                    className="rounded-xl border border-[#C2453F]/25 bg-[#C2453F]/[0.06] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="tabular text-sm font-semibold text-white">
                          {d.reference}
                          {order && (
                            <span className="ml-2 font-normal text-white/50">
                              {order.reference}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-white/45">
                          Raised by the {d.raised_side} ({people.get(d.raised_by) ?? "someone"}){" "}
                          on {shortDate(d.created_at)}
                          {order ? ` · supplier ${companies.get(order.supplier_company_id) ?? ""}` : ""}
                        </p>
                      </div>
                      <span className="tabular shrink-0 text-sm font-semibold text-white">
                        {formatMinor(taken, currency, scale)}
                      </span>
                    </div>

                    <p className="mt-3 rounded-lg bg-black/20 px-4 py-3 text-sm leading-relaxed text-white/75">
                      {d.reason}
                    </p>

                    <form action={resolveDispute.bind(null, d.id)} className="mt-4">
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="block">
                          <span className="block text-xs font-semibold tracking-wide text-white/45 uppercase">
                            Refund to the buyer ({currency})
                          </span>
                          <span className="mt-0.5 block text-xs text-white/35">
                            0 releases everything · up to{" "}
                            {formatMinor(refundable, currency, scale)}
                          </span>
                          <input
                            name="refund"
                            required
                            inputMode="decimal"
                            placeholder="0.00"
                            aria-label={`Amount to refund in ${currency}`}
                            className="tabular mt-1.5 w-40 rounded-lg bg-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-white/25"
                          />
                        </label>

                        <label className="block min-w-[14rem] flex-1">
                          <span className="block text-xs font-semibold tracking-wide text-white/45 uppercase">
                            What was decided, and why
                          </span>
                          <span className="mt-0.5 block text-xs text-white/35">
                            Both sides see this
                          </span>
                          <input
                            name="note"
                            placeholder="Two bags short, settled at 40 percent"
                            className="mt-1.5 w-full rounded-lg bg-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-white/25"
                          />
                        </label>

                        <button
                          type="submit"
                          className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-[#042115]"
                        >
                          Settle it
                        </button>
                      </div>
                    </form>

                    <p className="mt-3 text-xs text-white/40">
                      Whatever is not refunded goes to the supplier less{" "}
                      {SERVICE_CHARGE_DISPUTE_PERCENT} percent, half the usual{" "}
                      {SERVICE_CHARGE_PERCENT}. On{" "}
                      {formatMinor(refundable, currency, scale)} refunding nothing would
                      charge{" "}
                      {formatMinor(
                        Math.round((refundable * SERVICE_CHARGE_DISPUTE_PERCENT) / 100),
                        currency,
                        scale
                      )}
                      .
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Settled">
          {resolved.length === 0 ? (
            <Empty>Nothing settled yet.</Empty>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Raised by</Th>
                  <Th right>Back to buyer</Th>
                  <Th right>To supplier</Th>
                  <Th right>Charge</Th>
                  <Th>Decision</Th>
                </tr>
              </thead>
              <tbody>
                {resolved.map((d) => {
                  const order = orders.get(d.order_id);
                  const currency = d.currency ?? order?.currency ?? "GBP";
                  const scale = units[currency] ?? 2;
                  const net = (d.release_minor ?? 0) - (d.commission_minor ?? 0);
                  return (
                    <tr key={d.id}>
                      <Td>
                        <span className="tabular font-semibold text-white">{d.reference}</span>
                        <span className="mt-0.5 block text-xs text-white/40">
                          {order?.reference} · {shortDate(d.resolved_at)}
                        </span>
                      </Td>
                      <Td muted>{d.raised_side}</Td>
                      <Td right muted>
                        <span className="tabular">
                          {formatMinor(d.refund_minor ?? 0, currency, scale)}
                        </span>
                      </Td>
                      <Td right>
                        <span className="tabular font-semibold text-white">
                          {formatMinor(net, currency, scale)}
                        </span>
                      </Td>
                      <Td right muted>
                        <span className="tabular">
                          {formatMinor(d.commission_minor ?? 0, currency, scale)}
                        </span>
                      </Td>
                      <Td muted>
                        <span className="block max-w-[16rem] text-xs leading-relaxed">
                          {d.resolution_note || <span className="text-white/25">No note</span>}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Panel>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-white/35">
        Settling a dispute does four things at once: records the decision, queues the
        buyer&rsquo;s refund, rewrites the supplier&rsquo;s payout at{" "}
        {SERVICE_CHARGE_DISPUTE_PERCENT} percent, and releases the order, which a disputed
        order never gets from the buyer. All four happen in one database transaction, so a
        half settled dispute is not a state the platform can reach.{" "}
        <Link href="/admin/payouts" className="text-gold hover:underline">
          The payout itself
        </Link>{" "}
        is then sent from the payouts screen as usual.
      </p>
    </AdminShell>
  );
}
