import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import AdminShell, { Panel } from "@/components/admin/Shell";
import {
  MoneyCard,
  StatusPill,
  TableWrap,
  Th,
  Td,
  Empty,
  REFUND_STATUS,
} from "@/components/admin/Money";
import { formatMinor } from "@/lib/money";
import { sumByCurrency, formatTotals, minorUnitsMap, shortDate } from "@/lib/admin-money";
import { raiseRefund, markRefundCompleted, markRefundFailed } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Refund management.
 *
 * Two halves: what has already been refunded, and the payments that could
 * still be. A refund goes back against the payment that brought the money
 * in, which is why the second half lists payments rather than orders.
 *
 * Partial refunds are supported and the headroom on each payment is shown,
 * because the commonest real case is not a cancelled order, it is a
 * dispute settled somewhere between nothing and everything.
 */

type Refund = {
  id: string;
  reference: string;
  status: string;
  currency: string;
  amount_minor: number;
  reason: string;
  failed_reason: string | null;
  created_at: string;
  completed_at: string | null;
  payment_id: string;
  order_id: string | null;
};

type Payment = {
  id: string;
  reference: string;
  status: string;
  currency: string;
  amount_minor: number;
  created_at: string;
  order_id: string | null;
  buyer_company_id: string | null;
  buyer_profile_id: string | null;
  supplier_company_id: string;
};

export default async function AdminRefundsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const svc = serviceClient();

  const [refundsRes, paymentsRes, units] = await Promise.all([
    svc
      .from("refunds")
      .select(
        "id, reference, status, currency, amount_minor, reason, failed_reason, " +
          "created_at, completed_at, payment_id, order_id"
      )
      .order("created_at", { ascending: false })
      .limit(300),
    svc
      .from("payments")
      .select(
        "id, reference, status, currency, amount_minor, created_at, order_id, " +
          "buyer_company_id, buyer_profile_id, supplier_company_id"
      )
      .in("status", ["successful", "partially_refunded"])
      .order("created_at", { ascending: false })
      .limit(200),
    minorUnitsMap(svc),
  ]);

  const refunds = (refundsRes.data ?? []) as unknown as Refund[];
  const payments = (paymentsRes.data ?? []) as unknown as Payment[];

  const companyIds = [
    ...new Set([
      ...payments.map((p) => p.supplier_company_id),
      ...payments.map((p) => p.buyer_company_id).filter((v): v is string => Boolean(v)),
    ]),
  ];
  const orderIds = [
    ...new Set(
      [...refunds.map((r) => r.order_id), ...payments.map((p) => p.order_id)].filter(
        (v): v is string => Boolean(v)
      )
    ),
  ];

  const [companiesRes, ordersRes] = await Promise.all([
    companyIds.length
      ? svc.from("companies").select("id, legal_name, trading_name").in("id", companyIds)
      : Promise.resolve({ data: [] }),
    orderIds.length
      ? svc.from("orders").select("id, reference").in("id", orderIds)
      : Promise.resolve({ data: [] }),
  ]);

  const companies = new Map(
    ((companiesRes.data ?? []) as { id: string; legal_name: string; trading_name: string | null }[])
      .map((c) => [c.id, c.trading_name || c.legal_name] as const)
  );
  const orders = new Map(
    ((ordersRes.data ?? []) as { id: string; reference: string }[]).map(
      (o) => [o.id, o.reference] as const
    )
  );
  const paymentRefs = new Map(payments.map((p) => [p.id, p.reference] as const));

  // How much of each payment is still refundable. Anything not failed is
  // already spoken for.
  const committed = new Map<string, number>();
  for (const r of refunds) {
    if (r.status === "failed") continue;
    committed.set(r.payment_id, (committed.get(r.payment_id) ?? 0) + r.amount_minor);
  }

  const done = refunds.filter((r) => r.status === "completed");
  const pending = refunds.filter((r) => r.status === "pending");

  const refundable = payments
    .map((p) => ({ payment: p, left: p.amount_minor - (committed.get(p.id) ?? 0) }))
    .filter((row) => row.left > 0);

  return (
    <AdminShell
      admin={admin}
      title="Refunds"
      subtitle="Money going back to buyers, and what is still refundable"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <MoneyCard
          label="Refunded"
          amounts={formatTotals(sumByCurrency(done, "amount_minor"), units)}
          caption={`${done.length} completed`}
          accent="blue"
        />
        <MoneyCard
          label="In progress"
          amounts={formatTotals(sumByCurrency(pending, "amount_minor"), units)}
          caption={pending.length === 0 ? "none outstanding" : `${pending.length} to send`}
          accent={pending.length > 0 ? "gold" : "slate"}
        />
        <MoneyCard
          label="Still refundable"
          amounts={formatTotals(
            sumByCurrency(
              refundable.map((r) => ({ currency: r.payment.currency, left: r.left })),
              "left"
            ),
            units
          )}
          caption={`across ${refundable.length} ${refundable.length === 1 ? "payment" : "payments"}`}
          accent="slate"
        />
      </div>

      <div className="mt-6">
        <Panel title="Refund records">
          {refunds.length === 0 ? (
            <Empty>
              No refunds yet. Raise one against a payment below, and it is recorded here with
              the reason.
            </Empty>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Against</Th>
                  <Th>Reason</Th>
                  <Th right>Amount</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((r) => (
                  <tr key={r.id}>
                    <Td>
                      <span className="tabular font-semibold text-white">{r.reference}</span>
                      <span className="mt-0.5 block text-xs text-white/40">
                        {shortDate(r.created_at)}
                      </span>
                    </Td>
                    <Td muted>
                      <span className="tabular">
                        {paymentRefs.get(r.payment_id) ?? "payment"}
                      </span>
                      {r.order_id && (
                        <span className="tabular mt-0.5 block text-xs text-white/35">
                          {orders.get(r.order_id) ?? ""}
                        </span>
                      )}
                    </Td>
                    <Td muted>
                      <span className="block max-w-[18rem] text-xs leading-relaxed">
                        {r.reason}
                      </span>
                    </Td>
                    <Td right>
                      <span className="tabular font-semibold text-white">
                        {formatMinor(r.amount_minor, r.currency, units[r.currency] ?? 2)}
                      </span>
                    </Td>
                    <Td>
                      <StatusPill status={r.status} map={REFUND_STATUS} />
                      {r.failed_reason && (
                        <span className="mt-1.5 block max-w-[14rem] text-xs text-[#E58B85]">
                          {r.failed_reason}
                        </span>
                      )}
                      {r.status === "pending" && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <form action={markRefundCompleted.bind(null, r.id)}>
                            <button
                              type="submit"
                              className="rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-[#042115]"
                            >
                              Mark refunded
                            </button>
                          </form>
                          <details>
                            <summary className="cursor-pointer list-none px-1 py-1.5 text-xs text-white/40 hover:text-white/70">
                              Failed
                            </summary>
                            <form
                              action={markRefundFailed.bind(null, r.id)}
                              className="mt-1.5 flex gap-1.5"
                            >
                              <input
                                name="reason"
                                placeholder="What went wrong"
                                className="min-w-0 flex-1 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs text-white placeholder:text-white/30"
                              />
                              <button
                                type="submit"
                                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/8"
                              >
                                Save
                              </button>
                            </form>
                          </details>
                        </div>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Raise a refund">
          {refundable.length === 0 ? (
            <Empty>
              Nothing is refundable. A payment appears here once it has been received and until
              it has been refunded in full.
            </Empty>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Payment</Th>
                  <Th>Buyer</Th>
                  <Th right>Paid</Th>
                  <Th right>Refundable</Th>
                  <Th>Refund</Th>
                </tr>
              </thead>
              <tbody>
                {refundable.map(({ payment: p, left }) => {
                  const scale = units[p.currency] ?? 2;
                  return (
                    <tr key={p.id}>
                      <Td>
                        <span className="tabular font-semibold text-white">{p.reference}</span>
                        <span className="mt-0.5 block text-xs text-white/40">
                          {shortDate(p.created_at)}
                          {p.order_id ? ` · ${orders.get(p.order_id) ?? ""}` : ""}
                        </span>
                      </Td>
                      <Td muted>
                        {p.buyer_company_id
                          ? (companies.get(p.buyer_company_id) ?? "Unknown")
                          : "A shopper"}
                      </Td>
                      <Td right muted>
                        <span className="tabular">
                          {formatMinor(p.amount_minor, p.currency, scale)}
                        </span>
                      </Td>
                      <Td right>
                        <span className="tabular font-semibold text-white">
                          {formatMinor(left, p.currency, scale)}
                        </span>
                      </Td>
                      <Td>
                        <form
                          action={raiseRefund.bind(null, p.id)}
                          className="flex flex-wrap items-center gap-1.5"
                        >
                          <input
                            name="amount"
                            inputMode="decimal"
                            required
                            defaultValue={(left / 10 ** scale).toFixed(scale)}
                            aria-label={`Amount to refund in ${p.currency}`}
                            className="tabular w-24 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs text-white"
                          />
                          <input
                            name="reason"
                            required
                            placeholder="Why"
                            aria-label="Reason for the refund"
                            className="min-w-0 flex-1 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs text-white placeholder:text-white/30"
                          />
                          <button
                            type="submit"
                            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/8"
                          >
                            Raise
                          </button>
                        </form>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
          <p className="pt-4 text-xs text-white/35">
            Raising a refund records the decision and the amount. Sending the money is a separate
            step, and a refunded order can no longer release a payout to its supplier.
          </p>
        </Panel>
      </div>
    </AdminShell>
  );
}
