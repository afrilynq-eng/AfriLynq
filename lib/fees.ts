/**
 * What AfriLynq charges, in one place.
 *
 * Collins asked for the commission to be visible rather than buried, and
 * he is right: a seller who discovers a deduction after their first sale
 * does not stay. So the number lives here, is shown on the listing form
 * before anybody commits to selling, and is stated again in the portal.
 *
 * Who pays, and who is told
 * -------------------------
 * The charge falls on the SELLER, on the value of a completed sale. It
 * is not added to what a buyer pays, and buyers are not shown it. That
 * is why the promise made to retailers on /for-retailers, that AfriLynq
 * takes no hidden margin on what they buy, is still true: a retailer
 * buying pays nothing here. The same retailer SELLING to a shopper does
 * pay it, because then they are the seller.
 *
 * Nothing is charged until there are orders to charge on, which there
 * are not yet. The figures below describe the published policy, and the
 * code that actually deducts anything comes with the payment work.
 */

/** The published name. Used everywhere the charge is mentioned. */
export const SERVICE_CHARGE_NAME = "AfriLynq Service Charge";

/**
 * Percent of the sale value, charged to the seller.
 *
 * Raised from 5 to 7 by Richard in the review on 15 November 2026. Every
 * page that mentions the charge reads this constant, so the number is
 * changed here and nowhere else.
 */
export const SERVICE_CHARGE_PERCENT = 7;

/**
 * The charge when an order ends in a dispute.
 *
 * Decided by Michael on 25 November 2026, after Richard left the question
 * unanswered through four asks. Two parts to the rule, and both matter:
 *
 *   the charge applies only to money that actually reaches the supplier,
 *   not to the original sale value, and at half the usual rate.
 *
 * So a £1,000 sale settled with £400 going back to the buyer leaves £600
 * released, of which AfriLynq keeps £21 and the supplier receives £579.
 * A clean sale would have earned £70, so a dispute costs AfriLynq £49.
 *
 * This must match app.dispute_charge_percent() in the database, which is
 * what the resolution actually calculates with. Changing one without the
 * other gives a supplier a figure on screen that is not the figure they
 * are paid.
 */
export const SERVICE_CHARGE_DISPUTE_PERCENT = 3.5;

/**
 * Worked example, because a percentage on its own is abstract and people
 * reliably misread who pays what. Pass the sale value and currency and
 * get back the three numbers a seller actually wants to see.
 */
export function serviceChargeExample(saleValue: number, currency = "GBP") {
  const charge = (saleValue * SERVICE_CHARGE_PERCENT) / 100;
  const net = saleValue - charge;

  const money = (n: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);

  return {
    sale: money(saleValue),
    charge: money(charge),
    net: money(net),
  };
}
