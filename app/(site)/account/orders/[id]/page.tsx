import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { currentUser, userCompanies, sessionClient } from "@/lib/supabase-server";
import { formatMinor, ORDER_STATUS } from "@/lib/money";
import { SERVICE_CHARGE_NAME } from "@/lib/fees";
import { startCheckout, advanceOrder, confirmDelivery, raiseDispute } from "../actions";
import { SERVICE_CHARGE_DISPUTE_PERCENT } from "@/lib/fees";

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

/** The same idea for moving the goods, kept apart so the two never clash. */
const DELIVERY_NOTICE: Record<string, { text: string; tone: string }> = {
  moved: {
    text: "Updated. The buyer can see where their order has got to.",
    tone: "border-forest/30 bg-forest/10 text-forest",
  },
  delivered: {
    text: "Marked delivered. The buyer now has to confirm it arrived, and your payment is released once they do.",
    tone: "border-forest/30 bg-forest/10 text-forest",
  },
  confirmed: {
    text: "Thank you. Your supplier's payment has been released for approval, and the order is complete as far as you are concerned.",
    tone: "border-forest/30 bg-forest/10 text-forest",
  },
  notyours: {
    text: "That is not your order to update.",
    tone: "border-sand-deep bg-sand-deep/40 text-ink-soft",
  },
  steperror: {
    text: "We could not update the order. Refresh the page and try again, and email info@afrilynq.co.uk if it keeps happening.",
    tone: "border-[#d9b3aa] bg-[#f6e3e0] text-[#8c3b2c]",
  },
  disputed: {
    text: "Raised. The money on this order is held until AfriLynq has looked at it, and we will be in touch with both sides.",
    tone: "border-gold/30 bg-gold/10 text-gold-deep",
  },
  noreason: {
    text: "Tell us what went wrong. A dispute without a reason cannot be settled fairly on either side.",
    tone: "border-[#d9b3aa] bg-[#f6e3e0] text-[#8c3b2c]",
  },
  alreadydisputed: {
    text: "There is already an open dispute on this order.",
    tone: "border-gold/30 bg-gold/10 text-gold-deep",
  },
  cannotdispute: {
    text: "This order cannot be disputed. Either it has not been paid for, or it is already closed.",
    tone: "border-sand-deep bg-sand-deep/40 text-ink-soft",
  },
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string; delivery?: string }>;
}) {
  const { id } = await params;
  const { payment, delivery } = await searchParams;

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
        "shipped_at, delivered_at, buyer_confirmed_at, disputed_at, dispute_resolved_at, " +
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
    shipped_at: string | null;
    delivered_at: string | null;
    buyer_confirmed_at: string | null;
    disputed_at: string | null;
    dispute_resolved_at: string | null;
    supplier_company_id: string;
    buyer_company_id: string | null;
    buyer_profile_id: string | null;
    quotation_id: string;
    created_at: string;
  };

  // Named rather than "the supplier", because the sentence that asks a
  // buyer to release somebody's money should say whose money it is.
  const { data: supplierRow } = await supabase
    .from("companies")
    .select("legal_name, trading_name")
    .eq("id", order.supplier_company_id)
    .maybeSingle();
  const supplier = supplierRow as { legal_name: string; trading_name: string | null } | null;
  const supplierName = supplier?.trading_name || supplier?.legal_name || "The supplier";

  const selling = mine.has(order.supplier_company_id);
  const iAmBuyer = order.buyer_profile_id
    ? order.buyer_profile_id === user.id
    : Boolean(order.buyer_company_id && mine.has(order.buyer_company_id));

  const state = ORDER_STATUS[order.status] ?? { label: order.status, tone: "bg-sand text-stone" };
  const net = order.total_minor - (order.commission_minor ?? 0);
  const notice = (payment ? NOTICE[payment] : null) ?? (delivery ? DELIVERY_NOTICE[delivery] : null);

  const pay = startCheckout.bind(null, order.id);
  const advance = advanceOrder.bind(null, order.id);
  const confirm = confirmDelivery.bind(null, order.id);
  const dispute = raiseDispute.bind(null, order.id);

  /**
   * What the supplier may do next.
   *
   * The same ladder the database enforces in supplier_advance_order. It is
   * repeated here only to decide which button to draw; the function is
   * what actually holds, so a stale page cannot skip a step.
   */
  const SUPPLIER_STEPS: Record<string, { value: string; label: string }[]> = {
    confirmed: [
      { value: "in_production", label: "Start preparing it" },
      { value: "shipped", label: "Mark dispatched" },
    ],
    in_production: [{ value: "shipped", label: "Mark dispatched" }],
    // in_transit is confirmed present in app.order_status, so it is offered.
    // It is optional: a short delivery can go straight from dispatched to
    // delivered without anybody pretending there was a leg in between.
    shipped: [
      { value: "in_transit", label: "Mark in transit" },
      { value: "delivered", label: "Mark delivered" },
    ],
    in_transit: [{ value: "delivered", label: "Mark delivered" }],
  };
  const steps = selling ? (SUPPLIER_STEPS[order.status] ?? []) : [];
  const needsCarrier = steps.some((s) => s.value === "shipped");

  // The buyer confirms only once the supplier has said it arrived, and
  // only once. This is the button that releases the supplier's money.
  const inDispute = order.status === "disputed" && !order.dispute_resolved_at;

  const awaitingConfirmation =
    iAmBuyer && Boolean(order.delivered_at) && !order.buyer_confirmed_at && !inDispute;

  /**
   * Who may raise a dispute, and when.
   *
   * Both sides, once money is in and before the order closes. A supplier
   * needs this as much as a buyer does: the commonest way a supplier is
   * left unpaid is not fraud, it is a buyer who received the goods and
   * never pressed the button.
   */
  const canDispute =
    (iAmBuyer || selling) &&
    !inDispute &&
    !["awaiting_payment", "completed", "cancelled"].includes(order.status);

  const when = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

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

      {/* The buyer's confirmation. Deliberately the most prominent thing on
          the page when it is due, because nothing else on the platform
          releases a supplier's money and an order that quietly waits here
          is a supplier going unpaid. */}
      {awaitingConfirmation && (
        <div className="rounded-xl border-2 border-forest bg-forest/5 p-7 shadow-sm">
          <h2 className="text-lg">Has your order arrived?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            {supplierName} marked this delivered
            {order.delivered_at ? ` on ${when(order.delivered_at)}` : ""}. Confirming releases
            their payment. Only do it once you have the goods and they are what you ordered.
          </p>
          <form action={confirm} className="mt-5">
            <button
              type="submit"
              className="rounded-lg bg-forest px-6 py-3 text-sm font-semibold text-white hover:bg-forest/90"
            >
              Yes, it arrived
            </button>
          </form>
          <p className="mt-3 text-xs text-ink-soft">
            If it has not arrived, or there is something wrong with it, do not confirm. Message
            the supplier, and email info@afrilynq.co.uk if you cannot resolve it.
          </p>
        </div>
      )}

      {/* An open dispute replaces everything else. Nothing moves while one
          is running, and the page should say so rather than leaving
          buttons about that will be refused. */}
      {inDispute && (
        <div className="rounded-xl border-2 border-gold bg-gold/5 p-7 shadow-sm">
          <h2 className="text-lg">This order is in dispute</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            {order.disputed_at ? `Raised on ${when(order.disputed_at)}. ` : ""}
            AfriLynq is holding the money while we look at it, and nothing is paid out or
            refunded until it is settled. We will be in touch with both sides.
          </p>
          <p className="mt-3 text-xs text-ink-soft">
            Anything you can send that helps, photographs, weights, delivery notes, send to
            info@afrilynq.co.uk with this order reference.
          </p>
        </div>
      )}

      {order.dispute_resolved_at && (
        <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
          <h2 className="text-lg">The dispute was settled</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Settled on {when(order.dispute_resolved_at)}.
            {selling
              ? ` Your share has been released, less the reduced service charge of ${SERVICE_CHARGE_DISPUTE_PERCENT} percent that applies when an order is disputed.`
              : " Any refund due to you has been queued and will follow."}
          </p>
        </div>
      )}

      {/* The supplier's ladder. Nothing is offered before the money is in. */}
      {selling && !inDispute && steps.length > 0 && (
        <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
          <h2 className="text-lg">Move this order along</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            The buyer sees each step. Once you mark it delivered they confirm receipt, and that
            is what releases your payment.
          </p>

          {needsCarrier && (
            <p className="mt-3 text-xs text-ink-soft">
              Add the carrier and tracking reference when you dispatch, so the buyer can follow
              it without having to ask you.
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {steps.map((step) => (
              <form key={step.value} action={advance} className="contents">
                <input type="hidden" name="status" value={step.value} />
                {step.value === "shipped" && (
                  <>
                    <input
                      name="carrier"
                      placeholder="Carrier"
                      defaultValue={order.carrier_name ?? ""}
                      aria-label="Carrier"
                      className="rounded-lg border border-sand-deep px-3 py-2 text-sm"
                    />
                    <input
                      name="tracking"
                      placeholder="Tracking reference"
                      defaultValue={order.tracking_reference ?? ""}
                      aria-label="Tracking reference"
                      className="rounded-lg border border-sand-deep px-3 py-2 text-sm"
                    />
                  </>
                )}
                <button
                  type="submit"
                  className="rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest/90"
                >
                  {step.label}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      {/* Where it has got to, once anything has happened. */}
      {(order.shipped_at || order.delivered_at || order.buyer_confirmed_at) && (
        <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
          <h2 className="text-lg">Progress</h2>
          <ol className="mt-4 space-y-3 text-sm">
            {[
              ["Dispatched", order.shipped_at],
              ["Supplier marked it delivered", order.delivered_at],
              ["Buyer confirmed it arrived", order.buyer_confirmed_at],
            ]
              .filter(([, at]) => Boolean(at))
              .map(([label, at]) => (
                <li key={String(label)} className="flex items-baseline justify-between gap-4">
                  <span className="text-ink">{label}</span>
                  <span className="text-ink-soft">{when(at as string)}</span>
                </li>
              ))}
          </ol>
          {selling && order.delivered_at && !order.buyer_confirmed_at && (
            <p className="mt-4 rounded-lg border border-gold/30 bg-gold/10 px-4 py-2.5 text-xs text-gold-deep">
              Waiting on the buyer to confirm receipt. Your payment is released once they do.
            </p>
          )}
          {selling && order.buyer_confirmed_at && (
            <p className="mt-4 rounded-lg border border-forest/30 bg-forest/10 px-4 py-2.5 text-xs text-forest">
              The buyer has confirmed. Your payment has been released for approval and will
              follow.
            </p>
          )}
        </div>
      )}

      {/* Deliberately quiet, and deliberately last. A dispute should be
          available without being suggested: a prominent button inviting
          one is an invitation to use it instead of a message. */}
      {canDispute && (
        <details className="rounded-xl border border-sand-deep bg-paper px-7 py-5 shadow-sm">
          <summary className="cursor-pointer list-none text-sm font-medium text-ink-soft hover:text-ink">
            Something has gone wrong with this order
          </summary>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
            {selling
              ? "If the buyer has received the goods and will not confirm it, raise this and we will look at it. Try messaging them first, since most of these are an oversight rather than a refusal."
              : "If the goods have not arrived, or they are not what you ordered, raise this and AfriLynq will hold the money while we look at it. Try messaging the supplier first, since most problems are settled that way in a day."}
          </p>
          <form action={dispute} className="mt-4">
            <label className="block">
              <span className="text-sm font-medium text-ink">What went wrong</span>
              <textarea
                name="reason"
                required
                rows={3}
                placeholder={
                  selling
                    ? "Delivered on the 14th, signed for, buyer has not responded to three messages"
                    : "Two of the ten bags were short weight and three arrived damp"
                }
                className="mt-1.5 w-full rounded-lg border border-sand-deep px-3 py-2.5 text-sm"
              />
            </label>
            <button
              type="submit"
              className="mt-3 rounded-lg border border-sand-deep px-5 py-2.5 text-sm font-semibold text-ink hover:bg-sand"
            >
              Raise it with AfriLynq
            </button>
          </form>
        </details>
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
