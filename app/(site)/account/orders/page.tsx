import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, userCompanies, sessionClient } from "@/lib/supabase-server";
import { formatMinor, ORDER_STATUS } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false, follow: false },
};

/**
 * Orders, from both sides, on one page.
 *
 * Same reasoning as the quotations list: the rows are the same rows and
 * only your position in them changes. A buyer sees what they owe and
 * what has arrived; a supplier sees what they are owed and what they
 * have to ship.
 *
 * Row level security does the filtering. stage4-04 taught these policies
 * about shoppers, so a buyer with no company sees their own orders here
 * exactly as a company buyer does.
 */
export default async function OrdersPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const companies = await userCompanies();
  const mine = new Set(companies.map((c) => c.id));
  const supabase = await sessionClient();

  const { data } = await supabase
    .from("orders")
    .select(
      "id, reference, status, currency, total_minor, commission_minor, created_at, " +
        "supplier_company_id, buyer_company_id, buyer_profile_id, expected_delivery_date"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  /**
   * Cast through unknown because the generated Supabase types predate
   * stage4-04, which added orders.buyer_profile_id. Until the types are
   * regenerated, the client infers an error shape for this select rather
   * than a row. The shape below is the migration's, and is the truth.
   */
  const orders = (data ?? []) as unknown as Array<{
    id: string;
    reference: string;
    status: string;
    currency: string;
    total_minor: number;
    commission_minor: number | null;
    created_at: string;
    supplier_company_id: string;
    buyer_company_id: string | null;
    buyer_profile_id: string | null;
    expected_delivery_date: string | null;
  }>;

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-sand-deep bg-paper p-10 text-center shadow-sm">
        <h1 className="text-xl">No orders yet</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
          An order appears here when a quotation is accepted. Until then, everything lives
          in enquiries and quotations.
        </p>
        <Link
          href="/account/quotations"
          className="mt-5 inline-block rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest/90"
        >
          Quotations
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
        <h1 className="text-xl">Orders</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Every accepted quotation becomes an order here, with where the money has got to.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-sand-deep bg-paper shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-sand-deep bg-sand-deep/30 text-left text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-5 py-3 font-semibold">Order</th>
              <th className="px-5 py-3 font-semibold">Your side</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Value</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const selling = mine.has(o.supplier_company_id);
              const state = ORDER_STATUS[o.status] ?? {
                label: o.status,
                tone: "bg-sand text-stone",
              };

              return (
                <tr key={o.id} className="border-b border-sand-deep/60 last:border-0">
                  <td className="px-5 py-4">
                    <Link
                      href={`/account/orders/${o.id}`}
                      className="font-semibold text-forest hover:underline"
                    >
                      {o.reference}
                    </Link>
                    <div className="mt-0.5 text-xs text-ink-soft">
                      {new Date(o.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-ink-soft">{selling ? "Selling" : "Buying"}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${state.tone}`}
                    >
                      {state.label}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="font-semibold">
                      {formatMinor(o.total_minor, o.currency)}
                    </div>
                    {/* A supplier is shown what actually reaches them, not
                        the headline. The deduction is never a surprise. */}
                    {selling && o.commission_minor ? (
                      <div className="mt-0.5 text-xs text-ink-soft">
                        {formatMinor(o.total_minor - o.commission_minor, o.currency)} to you
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
