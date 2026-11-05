import {
  SERVICE_CHARGE_NAME,
  SERVICE_CHARGE_PERCENT,
  serviceChargeExample,
} from "@/lib/fees";

/**
 * The service charge, stated to sellers.
 *
 * Shown on the listing form and in the supplier's portal, and nowhere a
 * buyer can see it. Two reasons for that. It is not a cost to a buyer,
 * so showing it on a public listing would imply the price includes a
 * fee they are paying. And a seller finding out about a deduction after
 * their first sale is how a marketplace loses sellers.
 *
 * "full" carries the worked example and is for the listing form, where
 * somebody is deciding whether to sell here at all. "compact" is a line
 * for a portal page that has already made the point once.
 */
export default function ServiceChargeNote({
  variant = "full",
  saleValue = 1000,
  currency = "GBP",
}: {
  variant?: "full" | "compact";
  saleValue?: number;
  currency?: string;
}) {
  const eg = serviceChargeExample(saleValue, currency);

  if (variant === "compact") {
    return (
      <p className="text-sm leading-relaxed text-ink-soft">
        <span className="font-medium text-ink">{SERVICE_CHARGE_NAME}:</span>{" "}
        {SERVICE_CHARGE_PERCENT}% of each completed sale, deducted before
        payout. Nothing is charged on enquiries, listings or quotes.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-sand-deep bg-sand/50 p-5">
      <h3 className="text-base font-semibold text-ink">
        {SERVICE_CHARGE_NAME}: {SERVICE_CHARGE_PERCENT}% of each sale
      </h3>

      <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-ink-soft">
        When a sale completes through AfriLynq, {SERVICE_CHARGE_PERCENT}% of
        the sale value is deducted before the rest is paid out to you. It is
        charged to the seller, not added to what the buyer pays.
      </p>

      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <div>
          <dt className="text-stone">A sale of</dt>
          <dd className="tabular mt-0.5 font-medium text-ink">{eg.sale}</dd>
        </div>
        <div>
          <dt className="text-stone">Service charge</dt>
          <dd className="tabular mt-0.5 font-medium text-ink">&minus; {eg.charge}</dd>
        </div>
        <div>
          <dt className="text-stone">You receive</dt>
          <dd className="tabular mt-0.5 font-semibold text-forest">{eg.net}</dd>
        </div>
      </dl>

      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
        Nothing is charged for listing, for receiving enquiries, or for
        quoting. Only a completed sale carries it.
      </p>
    </div>
  );
}
