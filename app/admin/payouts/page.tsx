import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import AdminShell, { Panel } from "@/components/admin/Shell";
import {
  MoneyCard,
  StatusPill,
  Filters,
  TableWrap,
  Th,
  Td,
  Empty,
  PAYOUT_STATUS,
} from "@/components/admin/Money";
import { formatMinor, ORDER_STATUS } from "@/lib/money";
import { sumByCurrency, formatTotals, minorUnitsMap, shortDate } from "@/lib/admin-money";
import { stepsFrom, deliveryConfirmed } from "@/lib/payout-flow";
import {
  approvePayout,
  markPayoutSent,
  markPayoutPaid,
  markPayoutManual,
  markPayoutFailed,
} from "./actions";

export const dynamic = "force-dynamic";

/**
 * Payout management: what AfriLynq owes suppliers, and where each one is.
 *
 * The rule the whole screen exists to enforce is the one Collins set: a
 * supplier is not paid until the buyer has confirmed the goods arrived.
 * So a payout is created the moment a payment settles, sits at pending
 * while the goods travel, and only becomes approvable once the order has
 * reached delivered. Approving it here is the human decision that releases
 * the money; nothing on this page sends it.
 *
 * Suppliers in countries no provider can reach are marked settle by hand.
 * Zambia and Togo are both live on the platform and neither can be paid
 * automatically, so that state is normal rather than exceptional.
 */

type Payout = {
  id: string;
  reference: string;
  status: string;
  currency: string;
  gross_minor: number;
  commission_rate: number;
  commission_minor: number;
  net_minor: number;
  disputed: boolean;
  manual: boolean;
  payout_currency: string | null;
  payout_amount_minor: number | null;
  exchange_rate: number | null;
  transfer_fee_minor: number | null;
  provider: string | null;
  provider_transfer_id: string | null;
  approved_at: string | null;
  sent_at: string | null;
  paid_at: string | null;
  failed_reason: string | null;
  notes: string | null;
  created_at: string;
  order_id: string;
  supplier_company_id: string;
};

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { status } = await searchParams;
  const svc = serviceClient();

  const [payoutsRes, units] = await Promise.all([
    svc
      .from("payouts")
      .select(
        "id, reference, status, currency, gross_minor, commission_rate, commission_minor, " +
          "net_minor, disputed, manual, payout_currency, payout_amount_minor, exchange_rate, " +
          "transfer_fee_minor, provider, provider_transfer_id, approved_at, sent_at, paid_at, " +
          "failed_reason, notes, created_at, order_id, supplier_company_id"
      )
      .order("created_at", { ascending: false })
      .limit(500),
    minorUnitsMap(svc),
  ]);

  const payouts = (payoutsRes.data ?? []) as unknown as Payout[];

  const companyIds = [...new Set(payouts.map((p) => p.supplier_company_id))];
  const orderIds = [...new Set(payouts.map((p) => p.order_id))];

  const [companiesRes, ordersRes] = await Promise.all([
    companyIds.length
      ? svc
          .from("companies")
          .select("id, legal_name, trading_name, country_code")
          .in("id", companyIds)
      : Promise.resolve({ data: [] }),
    orderIds.length
      ? svc
          .from("orders")
          .select("id, reference, status, buyer_confirmed_at")
          .in("id", orderIds)
      : Promise.resolve({ data: [] }),
  ]);

  const companies = new Map(
    ((companiesRes.data ?? []) as {
      id: string;
      legal_name: string;
      trading_name: string | null;
      country_code: string | null;
    }[]).map((c) => [c.id, c] as const)
  );
  const orders = new Map(
    ((ordersRes.data ?? []) as unknown as {
      id: string;
      reference: string;
      status: string;
      buyer_confirmed_at: string | null;
    }[]).map((o) => [o.id, o] as const)
  );

  const by = (s: string) => payouts.filter((p) => p.status === s);

  const owed = by("pending");
  const cleared = by("approved");
  const inFlight = by("processing");
  const paid = by("paid");
  const manual = by("manual");

  const counts = Object.keys(PAYOUT_STATUS).map((value) => ({
    value,
    label: PAYOUT_STATUS[value].label,
    count: by(value).length,
  }));

  const shown = status ? by(status) : payouts;

  // A payout can only be approved once the buyer has confirmed delivery.
  // This counts the ones that have cleared that bar and are waiting on an
  // administrator, which is the only number on the page that is a to-do.
  const readyNow = owed.filter((p) => deliveryConfirmed(orders.get(p.order_id))).length;

  return (
    <AdminShell
      admin={admin}
      title="Payouts"
      subtitle="What suppliers are owed, and what has reached them"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MoneyCard
          label="Owed to suppliers"
          amounts={formatTotals(sumByCurrency(owed, "net_minor"), units)}
          caption={
            readyNow > 0
              ? `${readyNow} ready to approve`
              : `${owed.length} waiting on delivery`
          }
          accent={readyNow > 0 ? "gold" : "slate"}
        />
        <MoneyCard
          label="Cleared, not yet sent"
          amounts={formatTotals(sumByCurrency(cleared, "net_minor"), units)}
          caption={`${cleared.length} approved for release`}
          accent="gold"
        />
        <MoneyCard
          label="In flight"
          amounts={formatTotals(sumByCurrency(inFlight, "net_minor"), units)}
          caption={`${inFlight.length} sent, awaiting the provider`}
          accent="blue"
        />
        <MoneyCard
          label="Paid out"
          amounts={formatTotals(sumByCurrency(paid, "net_minor"), units)}
          caption={`${paid.length} settled in full`}
          accent="green"
        />
      </div>

      {manual.length > 0 && (
        <div className="mt-4">
          <MoneyCard
            label="To settle by hand"
            amounts={formatTotals(sumByCurrency(manual, "net_minor"), units)}
            caption="no provider reaches these countries, so somebody sends these"
            accent="gold"
          />
        </div>
      )}

      {readyNow > 0 && (
        <p className="mt-6 rounded-lg border-l-2 border-gold bg-white/[0.04] px-4 py-3 text-sm text-white/75">
          {readyNow === 1
            ? "One payout has a confirmed delivery behind it and is waiting on you."
            : `${readyNow} payouts have confirmed deliveries behind them and are waiting on you.`}{" "}
          Approving releases the supplier&rsquo;s money.
        </p>
      )}

      <div className="mt-6">
        <Panel
          title="Supplier payment records"
          action={
            <Link
              href={`/admin/payouts/export${status ? `?status=${status}` : ""}`}
              className="text-sm text-gold hover:underline"
            >
              Download CSV
            </Link>
          }
        >
          <div className="pb-4">
            <Filters base="/admin/payouts" current={status} options={counts} />
          </div>

          {shown.length === 0 ? (
            <Empty>
              {payouts.length === 0
                ? "No payouts yet. One is raised automatically the moment a buyer's payment is confirmed."
                : "No payouts with that status."}
            </Empty>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Supplier</Th>
                  <Th right>Buyer paid</Th>
                  <Th right>Service charge</Th>
                  <Th right>Supplier gets</Th>
                  <Th>Where it is</Th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => {
                  const company = companies.get(p.supplier_company_id);
                  const order = orders.get(p.order_id);
                  const scale = units[p.currency] ?? 2;
                  const steps = stepsFrom(p.status);
                  const delivered = deliveryConfirmed(order);
                  // Approving moves the order off delivered, so a payout
                  // already past that point has cleared the check and must
                  // not be blocked by it a second time.
                  const cleared =
                    order?.status === "payout_approved" || order?.status === "completed";
                  const mayRelease = delivered || cleared;
                  const orderState = order
                    ? (ORDER_STATUS[order.status]?.label ?? order.status)
                    : null;

                  return (
                    <tr key={p.id}>
                      <Td>
                        <span className="tabular font-semibold text-white">{p.reference}</span>
                        <span className="mt-0.5 block text-xs text-white/40">
                          {shortDate(p.created_at)}
                          {order ? ` · ${order.reference}` : ""}
                        </span>
                        {p.disputed && (
                          <span className="mt-1 inline-block rounded bg-[#C2453F]/15 px-2 py-0.5 text-[0.65rem] font-semibold text-[#E58B85]">
                            Reduced by dispute
                          </span>
                        )}
                      </Td>
                      <Td muted>
                        {company?.trading_name || company?.legal_name || "Unknown"}
                        {company?.country_code && (
                          <span className="mt-0.5 block text-xs text-white/35">
                            {company.country_code}
                          </span>
                        )}
                      </Td>
                      <Td right muted>
                        <span className="tabular">
                          {formatMinor(p.gross_minor, p.currency, scale)}
                        </span>
                      </Td>
                      <Td right muted>
                        <span className="tabular">
                          {formatMinor(p.commission_minor, p.currency, scale)}
                        </span>
                        <span className="mt-0.5 block text-xs text-white/35">
                          {p.commission_rate} percent
                        </span>
                      </Td>
                      <Td right>
                        <span className="tabular font-semibold text-white">
                          {formatMinor(p.net_minor, p.currency, scale)}
                        </span>
                        {p.payout_amount_minor != null && p.payout_currency && (
                          <span className="tabular mt-0.5 block text-xs text-white/35">
                            sent as{" "}
                            {formatMinor(
                              p.payout_amount_minor,
                              p.payout_currency,
                              units[p.payout_currency] ?? 2
                            )}
                          </span>
                        )}
                      </Td>
                      <Td>
                        <StatusPill status={p.status} map={PAYOUT_STATUS} />

                        {p.status === "pending" && !delivered && (
                          <span className="mt-1.5 block text-xs text-white/40">
                            Order is {orderState?.toLowerCase() ?? "in progress"}. The buyer has
                            not confirmed delivery.
                          </span>
                        )}
                        {p.status === "pending" && delivered && (
                          <span className="mt-1.5 block text-xs text-[#4CC98D]">
                            Buyer confirmed delivery. Ready to approve.
                          </span>
                        )}
                        {p.failed_reason && (
                          <span className="mt-1.5 block max-w-[15rem] text-xs text-[#E58B85]">
                            {p.failed_reason}
                          </span>
                        )}
                        {p.paid_at && (
                          <span className="mt-1.5 block text-xs text-white/35">
                            paid {shortDate(p.paid_at)}
                          </span>
                        )}

                        {steps.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {steps.includes("approve") && (
                              <form action={approvePayout.bind(null, p.id)}>
                                <button
                                  type="submit"
                                  disabled={!mayRelease}
                                  title={
                                    mayRelease
                                      ? undefined
                                      : "The buyer has not confirmed delivery yet"
                                  }
                                  className="rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-[#042115] disabled:cursor-not-allowed disabled:bg-white/8 disabled:text-white/30"
                                >
                                  Approve
                                </button>
                              </form>
                            )}
                            {steps.includes("sent") && (
                              <form action={markPayoutSent.bind(null, p.id)}>
                                <Secondary>Mark sent</Secondary>
                              </form>
                            )}
                            {steps.includes("paid") && (
                              <form action={markPayoutPaid.bind(null, p.id)}>
                                <button
                                  type="submit"
                                  disabled={!mayRelease}
                                  title={
                                    mayRelease
                                      ? undefined
                                      : "The buyer has not confirmed delivery yet"
                                  }
                                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/8 disabled:cursor-not-allowed disabled:border-white/8 disabled:text-white/25"
                                >
                                  Mark paid
                                </button>
                              </form>
                            )}
                            {steps.includes("manual") && (
                              <form action={markPayoutManual.bind(null, p.id)}>
                                <Secondary>Settle by hand</Secondary>
                              </form>
                            )}
                            {steps.includes("failed") && (
                              <details className="w-full">
                                <summary className="cursor-pointer list-none text-xs text-white/40 hover:text-white/70">
                                  Record a failure
                                </summary>
                                <form
                                  action={markPayoutFailed.bind(null, p.id)}
                                  className="mt-1.5 flex gap-1.5"
                                >
                                  <input
                                    name="reason"
                                    placeholder="What went wrong"
                                    className="min-w-0 flex-1 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs text-white placeholder:text-white/30"
                                  />
                                  <Secondary>Save</Secondary>
                                </form>
                              </details>
                            )}
                          </div>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}

function Secondary({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/8"
    >
      {children}
    </button>
  );
}
