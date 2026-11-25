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
  PAYMENT_STATUS,
} from "@/components/admin/Money";
import { formatMinor } from "@/lib/money";
import {
  sumByCurrency,
  formatTotals,
  minorUnitsMap,
  shortDate,
  buyerName,
} from "@/lib/admin-money";

export const dynamic = "force-dynamic";

/**
 * Transaction history: every payment the platform has taken or tried to.
 *
 * Collins asked for payment management, transaction history and commission
 * tracking. This is the money coming in. Money going out is /admin/payouts
 * and money going back is /admin/refunds, kept apart because they are three
 * different ledgers with three different lifecycles.
 *
 * Everything reads through the service key, as the other admin pages do.
 * payments has a column grant rather than a table grant, so the provider's
 * raw response is unreadable to a signed in user; the service key can see
 * it and this page still does not select it, because nobody needs it on a
 * list screen.
 */

type Payment = {
  id: string;
  reference: string;
  status: string;
  currency: string;
  amount_minor: number;
  settled_minor: number | null;
  provider_fee_minor: number | null;
  provider: string;
  provider_tx_id: string | null;
  payment_method: string | null;
  failed_reason: string | null;
  verified_at: string | null;
  created_at: string;
  order_id: string | null;
  buyer_company_id: string | null;
  buyer_profile_id: string | null;
  supplier_company_id: string;
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { status } = await searchParams;
  const svc = serviceClient();

  const [paymentsRes, units] = await Promise.all([
    svc
      .from("payments")
      .select(
        "id, reference, status, currency, amount_minor, settled_minor, provider_fee_minor, " +
          "provider, provider_tx_id, payment_method, failed_reason, verified_at, created_at, " +
          "order_id, buyer_company_id, buyer_profile_id, supplier_company_id"
      )
      .order("created_at", { ascending: false })
      .limit(500),
    minorUnitsMap(svc),
  ]);

  const payments = (paymentsRes.data ?? []) as unknown as Payment[];

  // Names and order references, fetched for the rows on screen rather than
  // joined, which keeps this working whatever the generated types think the
  // foreign keys are called.
  const companyIds = new Set<string>();
  const profileIds = new Set<string>();
  const orderIds = new Set<string>();
  for (const p of payments) {
    companyIds.add(p.supplier_company_id);
    if (p.buyer_company_id) companyIds.add(p.buyer_company_id);
    if (p.buyer_profile_id) profileIds.add(p.buyer_profile_id);
    if (p.order_id) orderIds.add(p.order_id);
  }

  const [companiesRes, profilesRes, ordersRes] = await Promise.all([
    companyIds.size
      ? svc.from("companies").select("id, legal_name, trading_name").in("id", [...companyIds])
      : Promise.resolve({ data: [] }),
    profileIds.size
      ? svc.from("profiles").select("id, full_name").in("id", [...profileIds])
      : Promise.resolve({ data: [] }),
    orderIds.size
      ? svc
          .from("orders")
          .select("id, reference, status, commission_minor, currency")
          .in("id", [...orderIds])
      : Promise.resolve({ data: [] }),
  ]);

  const companies = new Map(
    ((companiesRes.data ?? []) as { id: string; legal_name: string; trading_name: string | null }[])
      .map((c) => [c.id, c.trading_name || c.legal_name] as const)
  );
  const people = new Map(
    ((profilesRes.data ?? []) as { id: string; full_name: string | null }[])
      .map((p) => [p.id, p.full_name || "A shopper"] as const)
  );
  const orders = new Map(
    ((ordersRes.data ?? []) as unknown as {
      id: string;
      reference: string;
      status: string;
      commission_minor: number | null;
      currency: string;
    }[]).map((o) => [o.id, o] as const)
  );

  // ---- The figures -----------------------------------------------------
  const received = payments.filter((p) => p.status === "successful");
  const open = payments.filter((p) => p.status === "pending");
  const lost = payments.filter((p) => p.status === "failed" || p.status === "cancelled");

  const collected = sumByCurrency(received, "amount_minor");

  // Settled is what actually landed after the provider's cut, and it is
  // only known once a verification call has filled it in. Where it is
  // missing the payment is simply left out of this figure rather than
  // counted at face value, which would overstate the bank balance.
  const settledRows = received.filter((p) => p.settled_minor !== null);
  const settled = sumByCurrency(settledRows, "settled_minor");
  const fees = sumByCurrency(
    received.filter((p) => p.provider_fee_minor !== null),
    "provider_fee_minor"
  );

  // Commission is fixed on the order when the quotation is accepted, so it
  // is read from the order rather than recalculated here. A rate changed
  // later must never move the charge on a deal already struck.
  const commissionRows = received
    .map((p) => (p.order_id ? orders.get(p.order_id) : undefined))
    .filter((o): o is NonNullable<typeof o> => Boolean(o))
    .map((o) => ({ currency: o.currency, commission_minor: o.commission_minor ?? 0 }));
  const commission = sumByCurrency(commissionRows, "commission_minor");

  const counts = Object.keys(PAYMENT_STATUS).map((value) => ({
    value,
    label: PAYMENT_STATUS[value].label,
    count: payments.filter((p) => p.status === value).length,
  }));

  const shown = status ? payments.filter((p) => p.status === status) : payments;

  return (
    <AdminShell
      admin={admin}
      title="Payments"
      subtitle="Every payment taken on the platform, and what it earned"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MoneyCard
          label="Received"
          amounts={formatTotals(collected, units)}
          caption={`${received.length} ${received.length === 1 ? "payment" : "payments"}`}
          accent="green"
        />
        <MoneyCard
          label="Service charge earned"
          amounts={formatTotals(commission, units)}
          caption="7 percent, fixed when each deal was struck"
          accent="gold"
        />
        <MoneyCard
          label="Landed after provider fees"
          amounts={formatTotals(settled, units)}
          caption={
            settledRows.length < received.length
              ? `${received.length - settledRows.length} not yet reconciled`
              : "all payments reconciled"
          }
          accent="blue"
        />
        <MoneyCard
          label="Provider fees"
          amounts={formatTotals(fees, units)}
          caption="what the payment provider kept"
          accent="slate"
        />
      </div>

      {(open.length > 0 || lost.length > 0) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <MoneyCard
            label="Checkouts still open"
            amounts={formatTotals(sumByCurrency(open, "amount_minor"), units)}
            caption={
              open.length === 0
                ? "none open"
                : `${open.length} started and not finished`
            }
            accent="gold"
          />
          <MoneyCard
            label="Failed or abandoned"
            amounts={formatTotals(sumByCurrency(lost, "amount_minor"), units)}
            caption={`${lost.length} ${lost.length === 1 ? "attempt" : "attempts"}, no money taken`}
            accent="red"
          />
        </div>
      )}

      <div className="mt-6">
        <Panel
          title="Transaction history"
          action={
            <Link
              href={`/admin/payments/export${status ? `?status=${status}` : ""}`}
              className="text-sm text-gold hover:underline"
            >
              Download CSV
            </Link>
          }
        >
          <div className="pb-4">
            <Filters base="/admin/payments" current={status} options={counts} />
          </div>

          {shown.length === 0 ? (
            <Empty>
              {payments.length === 0
                ? "No payments yet. A payment appears the moment a buyer opens checkout, whether or not they finish."
                : "No payments with that status."}
            </Empty>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Buyer</Th>
                  <Th>Supplier</Th>
                  <Th right>Amount</Th>
                  <Th right>Service charge</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => {
                  const order = p.order_id ? orders.get(p.order_id) : undefined;
                  const scale = units[p.currency] ?? 2;
                  return (
                    <tr key={p.id}>
                      <Td>
                        <span className="tabular font-semibold text-white">
                          {p.reference}
                        </span>
                        <span className="mt-0.5 block text-xs text-white/40">
                          {shortDate(p.created_at)}
                          {order ? " · " : ""}
                          {order && (
                            <Link
                              href={`/admin/payments/${p.id}`}
                              className="text-gold hover:underline"
                            >
                              {order.reference}
                            </Link>
                          )}
                        </span>
                      </Td>
                      <Td muted>
                        {buyerName(p.buyer_company_id, p.buyer_profile_id, companies, people)}
                      </Td>
                      <Td muted>{companies.get(p.supplier_company_id) ?? "Unknown"}</Td>
                      <Td right>
                        <span className="tabular font-semibold text-white">
                          {formatMinor(p.amount_minor, p.currency, scale)}
                        </span>
                        {p.payment_method && (
                          <span className="mt-0.5 block text-xs text-white/35">
                            {p.payment_method}
                          </span>
                        )}
                      </Td>
                      <Td right muted>
                        {order?.commission_minor != null && p.status === "successful" ? (
                          <span className="tabular">
                            {formatMinor(order.commission_minor, order.currency, scale)}
                          </span>
                        ) : (
                          <span className="text-white/25">&mdash;</span>
                        )}
                      </Td>
                      <Td>
                        <StatusPill status={p.status} map={PAYMENT_STATUS} />
                        {p.failed_reason && (
                          <span className="mt-1 block max-w-[14rem] text-xs text-white/40">
                            {p.failed_reason}
                          </span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}

          {payments.length >= 500 && (
            <p className="pt-4 text-xs text-white/35">
              Showing the most recent 500. The CSV export has everything.
            </p>
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}
