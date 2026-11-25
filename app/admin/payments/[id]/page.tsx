import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import AdminShell, { Panel } from "@/components/admin/Shell";
import {
  StatusPill,
  PAYMENT_STATUS,
  PAYOUT_STATUS,
  REFUND_STATUS,
  Empty,
} from "@/components/admin/Money";
import { formatMinor, ORDER_STATUS } from "@/lib/money";
import { minorUnitsMap, shortDate, buyerName } from "@/lib/admin-money";

export const dynamic = "force-dynamic";

/**
 * One payment, with everything that hangs off it.
 *
 * Collins asked for payment status for every order. The three ledgers are
 * separate by design, which is right for writing them and useless for
 * answering the only question anybody ever actually asks: what happened to
 * this money. So this page puts the payment, the order it belongs to, the
 * payout it owes and any refunds against it on one screen, in the order
 * the money moves.
 */

export default async function AdminPaymentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { id } = await params;
  const svc = serviceClient();

  const [{ data: paymentRow }, units] = await Promise.all([
    svc
      .from("payments")
      .select(
        "id, reference, status, currency, amount_minor, settled_minor, provider_fee_minor, " +
          "provider, provider_tx_id, payment_method, verified_at, failed_reason, created_at, " +
          "updated_at, order_id, quotation_id, buyer_company_id, buyer_profile_id, supplier_company_id"
      )
      .eq("id", id)
      .maybeSingle(),
    minorUnitsMap(svc),
  ]);

  if (!paymentRow) notFound();

  const payment = paymentRow as unknown as {
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
    verified_at: string | null;
    failed_reason: string | null;
    created_at: string;
    updated_at: string;
    order_id: string | null;
    quotation_id: string;
    buyer_company_id: string | null;
    buyer_profile_id: string | null;
    supplier_company_id: string;
  };

  const scale = units[payment.currency] ?? 2;
  const money = (m: number | null | undefined) =>
    m === null || m === undefined ? null : formatMinor(m, payment.currency, scale);

  const companyIds = [payment.supplier_company_id, payment.buyer_company_id].filter(
    (v): v is string => Boolean(v)
  );

  const [companiesRes, profilesRes, orderRes, payoutRes, refundsRes] = await Promise.all([
    svc.from("companies").select("id, legal_name, trading_name, country_code").in("id", companyIds),
    payment.buyer_profile_id
      ? svc.from("profiles").select("id, full_name").eq("id", payment.buyer_profile_id)
      : Promise.resolve({ data: [] }),
    payment.order_id
      ? svc
          .from("orders")
          .select(
            "id, reference, status, currency, total_minor, commission_rate, commission_minor, created_at"
          )
          .eq("id", payment.order_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    payment.order_id
      ? svc
          .from("payouts")
          .select(
            "id, reference, status, currency, gross_minor, commission_minor, net_minor, " +
              "manual, approved_at, sent_at, paid_at, failed_reason"
          )
          .eq("order_id", payment.order_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    svc
      .from("refunds")
      .select("id, reference, status, currency, amount_minor, reason, created_at, completed_at")
      .eq("payment_id", payment.id)
      .order("created_at", { ascending: false }),
  ]);

  const companies = new Map(
    ((companiesRes.data ?? []) as {
      id: string;
      legal_name: string;
      trading_name: string | null;
      country_code: string | null;
    }[]).map((c) => [c.id, c] as const)
  );
  const people = new Map(
    ((profilesRes.data ?? []) as { id: string; full_name: string | null }[])
      .map((p) => [p.id, p.full_name || "A shopper"] as const)
  );

  const names = new Map(
    [...companies.entries()].map(([k, v]) => [k, v.trading_name || v.legal_name] as const)
  );

  const order = orderRes.data as unknown as {
    id: string;
    reference: string;
    status: string;
    currency: string;
    total_minor: number;
    commission_rate: number | null;
    commission_minor: number | null;
    created_at: string;
  } | null;

  const payout = payoutRes.data as unknown as {
    id: string;
    reference: string;
    status: string;
    currency: string;
    gross_minor: number;
    commission_minor: number;
    net_minor: number;
    manual: boolean;
    approved_at: string | null;
    sent_at: string | null;
    paid_at: string | null;
    failed_reason: string | null;
  } | null;

  const refunds = (refundsRes.data ?? []) as unknown as {
    id: string;
    reference: string;
    status: string;
    currency: string;
    amount_minor: number;
    reason: string;
    created_at: string;
    completed_at: string | null;
  }[];

  const supplier = companies.get(payment.supplier_company_id);

  return (
    <AdminShell
      admin={admin}
      title={payment.reference}
      subtitle={`Payment taken on ${shortDate(payment.created_at)}`}
    >
      <Link href="/admin/payments" className="text-sm text-gold hover:underline">
        &larr; All payments
      </Link>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <Panel title="The payment">
          <dl className="space-y-3 text-sm">
            <Row k="Status">
              <StatusPill status={payment.status} map={PAYMENT_STATUS} />
            </Row>
            <Row k="Amount">
              <span className="tabular font-semibold text-white">
                {money(payment.amount_minor)}
              </span>
            </Row>
            <Row k="Landed after fees">
              <span className="tabular">
                {money(payment.settled_minor) ?? (
                  <span className="text-white/30">not reconciled yet</span>
                )}
              </span>
            </Row>
            <Row k="Provider fee">
              <span className="tabular">
                {money(payment.provider_fee_minor) ?? (
                  <span className="text-white/30">unknown</span>
                )}
              </span>
            </Row>
            <Row k="Buyer">
              {buyerName(payment.buyer_company_id, payment.buyer_profile_id, names, people)}
            </Row>
            <Row k="Supplier">
              {supplier?.trading_name || supplier?.legal_name || "Unknown"}
              {supplier?.country_code ? ` (${supplier.country_code})` : ""}
            </Row>
            <Row k="Method">
              {payment.payment_method ?? <span className="text-white/30">not recorded</span>}
            </Row>
            <Row k="Provider">{payment.provider}</Row>
            <Row k="Provider reference">
              <span className="tabular text-xs break-all">
                {payment.provider_tx_id ?? <span className="text-white/30">none</span>}
              </span>
            </Row>
            <Row k="Verified">
              {payment.verified_at ? (
                shortDate(payment.verified_at)
              ) : (
                <span className="text-white/30">never</span>
              )}
            </Row>
            {payment.failed_reason && (
              <Row k="Failure">
                <span className="text-[#E58B85]">{payment.failed_reason}</span>
              </Row>
            )}
          </dl>
          <p className="mt-5 border-t border-white/8 pt-4 text-xs text-white/35">
            A payment is only marked received by a server-side verification call against the
            provider. A buyer returning to a success page proves nothing on its own.
          </p>
        </Panel>

        <div className="space-y-6">
          <Panel title="The order">
            {!order ? (
              <Empty>
                No order yet. The payment was raised when checkout opened and the buyer has
                not completed it.
              </Empty>
            ) : (
              <dl className="space-y-3 text-sm">
                <Row k="Reference">
                  <span className="tabular font-semibold text-white">{order.reference}</span>
                </Row>
                <Row k="Status">
                  {ORDER_STATUS[order.status]?.label ?? order.status}
                </Row>
                <Row k="Order value">
                  <span className="tabular">
                    {formatMinor(order.total_minor, order.currency, scale)}
                  </span>
                </Row>
                <Row k="Service charge">
                  <span className="tabular">
                    {formatMinor(order.commission_minor ?? 0, order.currency, scale)}
                  </span>
                  <span className="ml-1.5 text-white/35">
                    ({order.commission_rate ?? 0} percent)
                  </span>
                </Row>
                <Row k="Raised">{shortDate(order.created_at)}</Row>
              </dl>
            )}
          </Panel>

          <Panel
            title="The payout"
            action={
              payout ? (
                <Link href="/admin/payouts" className="text-sm text-gold hover:underline">
                  Manage
                </Link>
              ) : undefined
            }
          >
            {!payout ? (
              <Empty>
                No payout yet. One is raised the moment this payment is confirmed.
              </Empty>
            ) : (
              <dl className="space-y-3 text-sm">
                <Row k="Reference">
                  <span className="tabular font-semibold text-white">{payout.reference}</span>
                </Row>
                <Row k="Status">
                  <StatusPill status={payout.status} map={PAYOUT_STATUS} />
                </Row>
                <Row k="Supplier gets">
                  <span className="tabular font-semibold text-white">
                    {formatMinor(payout.net_minor, payout.currency, scale)}
                  </span>
                </Row>
                {payout.approved_at && <Row k="Approved">{shortDate(payout.approved_at)}</Row>}
                {payout.paid_at && <Row k="Paid">{shortDate(payout.paid_at)}</Row>}
                {payout.failed_reason && (
                  <Row k="Failure">
                    <span className="text-[#E58B85]">{payout.failed_reason}</span>
                  </Row>
                )}
              </dl>
            )}
          </Panel>
        </div>
      </div>

      <div className="mt-6">
        <Panel
          title="Refunds against this payment"
          action={
            <Link href="/admin/refunds" className="text-sm text-gold hover:underline">
              Raise one
            </Link>
          }
        >
          {refunds.length === 0 ? (
            <Empty>Nothing has been refunded against this payment.</Empty>
          ) : (
            <ul className="space-y-2.5">
              {refunds.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="tabular text-sm font-semibold text-white">{r.reference}</p>
                    <p className="mt-0.5 max-w-xl text-xs text-white/45">{r.reason}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular text-sm font-semibold text-white">
                      {formatMinor(r.amount_minor, r.currency, units[r.currency] ?? 2)}
                    </span>
                    <StatusPill status={r.status} map={REFUND_STATUS} />
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

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <dt className="text-white/45">{k}</dt>
      <dd className="text-right text-white/85">{children}</dd>
    </div>
  );
}
