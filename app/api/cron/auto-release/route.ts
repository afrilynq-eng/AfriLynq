import { serviceClient } from "@/lib/supabase";
import { notifyBuyer, notifyCompany } from "@/lib/notify";
import { formatMinor } from "@/lib/money";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Releasing payouts the buyer never confirmed.
 *
 * A supplier is paid when the buyer confirms delivery. On its own that
 * rule strands the supplier: a buyer who simply never presses the button
 * leaves their supplier unpaid for ever, with no way out but raising a
 * dispute against a customer they would rather keep. Seven days after a
 * delivery, with no confirmation and no dispute, this releases it.
 *
 * Runs once a day from Vercel's scheduler. The work itself is one
 * database function so the whole sweep is a single transaction: an order
 * cannot end up released with its payout left pending, which is exactly
 * the state that would be hardest to notice and worst to be in.
 *
 * It is safe to run twice, and safe to run by hand.
 */
export async function GET(request: Request) {
  /**
   * Vercel sends the Authorization header on scheduled calls. Without a
   * secret configured this endpoint is a URL anybody can hit to release
   * every eligible payout on the platform, so no secret means no service.
   */
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[auto-release] CRON_SECRET is not set, refusing to run");
    return Response.json({ ok: false, error: "not configured" }, { status: 503 });
  }

  const offered = request.headers.get("authorization");
  if (offered !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "not authorised" }, { status: 401 });
  }

  const svc = serviceClient();

  const { data, error } = await svc.rpc("release_unconfirmed_deliveries", {
    p_days: null,
  });

  if (error) {
    console.error("[auto-release] failed", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const released = (data ?? []) as unknown as {
    order_id: string;
    order_reference: string;
    supplier_company_id: string;
    buyer_company_id: string | null;
    buyer_profile_id: string | null;
    payout_reference: string;
    net_minor: number;
    currency: string;
  }[];

  /**
   * Both sides are told, and the buyer's message matters as much as the
   * supplier's. Money moved without them doing anything, and the first
   * they hear of it should not be a bank statement.
   */
  for (const r of released) {
    const money = formatMinor(r.net_minor, r.currency);

    await notifyCompany(r.supplier_company_id, {
      kind: "payout_approved",
      title: `Your payment of ${money} has been released`,
      body:
        `Order ${r.order_reference} was delivered more than seven days ago and the buyer ` +
        `did not raise anything, so your payment of ${money} has been released ` +
        "automatically.\n\nIt will reach the account you gave us shortly.",
      linkPath: "/account/payouts",
      linkLabel: "See your payments",
    });

    await notifyBuyer(
      {
        buyer_company_id: r.buyer_company_id,
        buyer_profile_id: r.buyer_profile_id,
      },
      {
        kind: "payout_approved",
        title: `Order ${r.order_reference} has been closed`,
        body:
          `Order ${r.order_reference} was marked delivered more than seven days ago and we ` +
          "did not hear from you, so the supplier has now been paid.\n\n" +
          "If something is wrong with this order, email info@afrilynq.co.uk with the " +
          "reference and we will look at it.",
        linkPath: `/account/orders/${r.order_id}`,
        linkLabel: "View the order",
      }
    );
  }

  // Logged whether or not anything moved, because a quiet night and a
  // broken job look identical otherwise.
  console.log(`[auto-release] released ${released.length}`);

  return Response.json({
    ok: true,
    released: released.length,
    references: released.map((r) => r.order_reference),
  });
}
