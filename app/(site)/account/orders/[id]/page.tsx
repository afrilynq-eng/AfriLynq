import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { currentUser, userCompanies, sessionClient } from "@/lib/supabase-server";
import { formatMinor, ORDER_STATUS } from "@/lib/money";
import { SERVICE_CHARGE_NAME } from "@/lib/fees";
import { startCheckout } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false, follow: false },
};

const NOTICE: Record<string, { text: string; tone: string }> = {
  done: {
    text: "Payment received. The supplier has been told and will begin preparing your order.",
    tone: "border-forest/30 bg-forest/10 text-forest",
  },
  pending: {
    text: "Your payment went through and we are still confirming it with the provider. This page will catch up shortly, and nothing further is needed from you.",
    tone: "border-gold/30 bg-gold/10 text-gold-deep",
  },
  cancelled: {
    text: "Payment was cancelled. Nothing has been charged and you can try again whenever you are ready.",
    tone: "border-sand-deep bg-sand-deep/40 text-ink-soft",
  },
  unknown: {
    text: "We could not match that payment. If money has left your account, email info@afrilynq.co.uk with this order reference and we will sort it out.",
    tone: "border-[#d9b3aa] bg-[#f6e3e0] text-[#8c3b2c]",
  },
  // The codes startCheckout redirects with when it cannot proceed. Each one
  // says what happened and what to do, because a buyer pressing Pay and
  // landing back on the same page with no explanation assumes it is broken.
  notconfigured: {
    text: "Payments are not switched on yet. Nothing is wrong with your order, and we will email you when you can pay.",
    tone: "border-gold/30 bg-gold/10 text-gold-deep",
  },
  notbuyer: {
    text: "Only the buyer on this order can pay for it.",
    tone: "border-sand-deep bg-sand-deep/40 text-ink-soft",
  },
  alreadypaid: {
    text: "This order has already been paid for. Nothing further is needed.",
    tone: "border-forest/30 bg-forest/10 text-forest",
  },
  notfound: {
    text: "We could not find that order.",
    tone: "border-[#d9b3aa] bg-[#f6e3e0] text-[#8c3b2c]",
  },
  error: {
    text: "We could not start the payment, and nothing has been charged. Please try again, and email info@afrilynq.co.uk if it keeps happening.",
    tone: "border-[#d9b3aa] bg-[#f6e3e0] text-[#8c3b2c]",
  },
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { id } = await params;
  const { payment } = await searchParams;

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const companies = await userCompanies();
  const mine = new Set(companies.map((c) => c.id));
  const supabase = await sessionClient();

  const { data } = await supabase
    .from("orders")
    .select(
      "id, reference, status, currency, total_minor, commission_rate, commission_minor, " +
        "incoterm, delivery_address, expected_delivery_date, carrier_name, tracking_reference, " +
        "supplier_company_id, buyer_company_id, buyer_profile_id, quotation_id, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  /**
   * Cast through unknown because the generated Supabase types predate
   * stage4-04, which added orders.buyer_profile_id. Until the types are
   * regenerated, the client infers an error shape for this select rather
   * than a row. The shape below is the migration's, and is the truth.
   */
  const order = data as unknown as {
    id: string;
    reference: string;
    status: string;
    currency: string;
    total_minor: number;
    commission_rate: number | null;
    commission_minor: number | null;
    incoterm: string | null;
    delivery_address: string | null;
    expected_delivery_date: string | null;
    carrier_name: string | null;
    tracking_reference: string | null;
    supplier_company_id: string;
    buyer_company_id: string | null;
    buyer_profile_id: string | null;
    quotation_id: string;
    created_at: string;
  };

  const selling = mine.has(order.supplier_company_id);
  const iAmBuyer = order.buyer_profile_id
    ? order.buyer_profile_id === user.id
    : Boolean(order.buyer_company_id && mine.has(order.buyer_company_id));

  const state = ORDER_STATUS[order.status] ?? { label: order.status, tone: "bg-sand text-stone" };
  const net = order.total_minor - (order.commission_minor ?? 0);
  const notice = payment ? NOTICE[payment] : null;

  const pay = startCheckout.bind(null, order.id);

  return (
    <div className="space-y-6">
      {notice && (
        <p className={`rounded-xl border px-4 py-3 text-sm ${notice.tone}`}>{notice.text}</p>
      )}

      <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl">Order {order.reference}</h1>
            <p className="mt-1 text-sm text-ink-soft">
              {selling ? "You are the supplier" : "You are the buyer"} ·{" "}
              {new Date(order.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${state.tone}`}>
            {state.label}
          </span>
        </div>

        <Link
          href={`/account/quotations/${order.quotation_id}`}
          className="mt-4 inline-block text-sm font-semibold text-forest hover:underline"
        >
          See the quotation this came from
        </Link>
      </div>

      {/* Payment. Only the buyer sees the button, and only while the order
          is actually waiting for money. */}
      {iAmBuyer && order.status === "awaiting_payment" && (
        <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
          <h2 className="text-lg">Pay for this order</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            AfriLynq holds your payment until you confirm the goods have arrived. The
            supplier is not paid before that.
          </p>

          <form action={pay} className="mt-5">
            <button
              type="submit"
              className="rounded-lg bg-forest px-6 py-3 text-sm font-semibold text-white hover:bg-forest/90"
            >
              Pay {formatMinor(order.total_minor, order.currency)}
            </button>
          </form>

          <p className="mt-3 text-xs text-ink-soft">
            You will be taken to Flutterwave to pay, and brought back here afterwards. Card
            details never touch AfriLynq.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
        <h2 className="text-lg">The money</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Order value</dt>
            <dd className="font-semibold">{formatMinor(order.total_minor, order.currency)}</dd>
          </div>

          {/* The deduction is shown to the supplier and not to the buyer,
              which is the policy Collins set: visible, never hidden, and
              never charged to the person buying. */}
          {selling && (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">
                  {SERVICE_CHARGE_NAME} ({order.commission_rate ?? 0} percent)
                </dt>
                <dd>-{formatMinor(order.commission_minor ?? 0, order.currency)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-sand-deep pt-3">
                <dt className="font-semibold">Reaches you</dt>
                <dd className="font-semibold">{formatMinor(net, order.currency)}</dd>
              </div>
            </>
          )}
        </dl>

        {selling && order.status === "awaiting_payment" && (
          <p className="mt-4 rounded-lg border border-gold/30 bg-gold/10 px-4 py-2.5 text-xs text-gold-deep">
            The buyer has accepted but has not paid yet. Do not ship until this says payment
            confirmed.
          </p>
        )}
      </div>

      {(order.incoterm || order.delivery_address || order.carrier_name) && (
        <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
          <h2 className="text-lg">Delivery</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {order.incoterm && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Terms</dt>
                <dd>{order.incoterm}</dd>
              </div>
            )}
            {order.delivery_address && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">To</dt>
                <dd className="max-w-sm text-right">{order.delivery_address}</dd>
              </div>
            )}
            {order.expected_delivery_date && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Expected</dt>
                <dd>
                  {new Date(order.expected_delivery_date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            )}
            {order.carrier_name && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Carrier</dt>
                <dd>
                  {order.carrier_name}
                  {order.tracking_reference ? ` · ${order.tracking_reference}` : ""}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
