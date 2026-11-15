import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, userCompanies, sessionClient } from "@/lib/supabase-server";
import { formatMinor, QUOTATION_STATUS } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quotations",
  robots: { index: false, follow: false },
};

/**
 * Quotations, from both sides of them.
 *
 * One page rather than two, because the rows are the same rows and the
 * only difference is which company you are. A buyer sees who quoted
 * them and what it will cost; a supplier sees who they quoted and
 * whether it was taken. A company that both buys and sells sees both,
 * which is why the "From" and "To" columns are decided per row rather
 * than for the page.
 *
 * RLS does the filtering: a buyer cannot see a draft, and neither party
 * can see anybody else's.
 */

export default async function QuotationsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const companies = await userCompanies();
  const mine = new Set(companies.map((c) => c.id));
  const supabase = await sessionClient();

  const { data } = await supabase
    .from("quotations")
    .select(
      "id, reference, status, currency, total_minor, valid_until, created_at, " +
        "sent_at, supplier_company_id, buyer_company_id, buyer_profile_id, enquiry_id"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as unknown as {
    id: string;
    reference: string;
    status: string;
    currency: string;
    total_minor: number;
    valid_until: string | null;
    created_at: string;
    supplier_company_id: string;
    buyer_company_id: string | null;
    buyer_profile_id: string | null;
  }[];

  // Names for the other party, in one query rather than one per row.
  const otherIds = Array.from(
    new Set(
      rows.map((r) =>
        mine.has(r.supplier_company_id)
          ? r.buyer_company_id ?? r.buyer_profile_id
          : r.supplier_company_id
      )
    )
  ).filter((v): v is string => Boolean(v));

  /**
   * A quotation's buyer may be a shopper, who is a person and not in the
   * companies table at all. Both lookups run against the same id list and
   * whichever one holds it wins; ids do not collide across tables.
   */
  const names = new Map<string, string>();
  if (otherIds.length > 0) {
    const { data: people } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", otherIds);
    for (const person of (people ?? []) as { id: string; full_name: string | null }[]) {
      names.set(person.id, person.full_name || "A shopper");
    }

    const { data: cos } = await supabase
      .from("companies")
      .select("id, legal_name, trading_name")
      .in("id", otherIds);
    for (const c of (cos ?? []) as {
      id: string;
      legal_name: string;
      trading_name: string | null;
    }[]) {
      names.set(c.id, c.trading_name || c.legal_name);
    }
  }

  const { data: curs } = await supabase.from("currencies").select("code, minor_units");
  const minor = new Map(
    ((curs ?? []) as { code: string; minor_units: number }[]).map((c) => [
      c.code,
      c.minor_units,
    ])
  );

  const awaiting = rows.filter(
    (r) =>
      r.status === "sent" &&
      (r.buyer_company_id
        ? mine.has(r.buyer_company_id)
        : r.buyer_profile_id === user.id)
  ).length;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl">Quotations</h1>
          <p className="mt-2 text-ink-soft">
            {rows.length === 0
              ? "Nothing yet."
              : awaiting > 0
                ? `${awaiting} waiting for your answer.`
                : "Everything here has been answered."}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-sand-deep bg-paper p-10 text-center shadow-sm">
          <h2 className="text-2xl">No quotations yet</h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-ink-soft">
            A quotation appears here when a supplier prices one of your
            enquiries, or when you price one you have received. If you are
            buying, send an enquiry from a listing and the supplier can quote
            against it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/marketplace" className="btn-lift btn-primary">
              Browse the marketplace
            </Link>
            <Link href="/account/enquiries" className="btn-lift btn-ghost">
              My enquiries
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-sand-deep bg-paper shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-deep text-[0.7rem] tracking-widest text-stone uppercase">
                <th scope="col" className="px-5 py-3.5 font-semibold">Reference</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Party</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Valid until</th>
                <th scope="col" className="px-5 py-3.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const iAmSupplier = mine.has(r.supplier_company_id);
                const otherId = iAmSupplier
                  ? r.buyer_company_id ?? r.buyer_profile_id
                  : r.supplier_company_id;
                const badge = QUOTATION_STATUS[r.status] ?? {
                  label: r.status,
                  tone: "bg-sand text-stone",
                };
                return (
                  <tr
                    key={r.id}
                    className="border-b border-sand transition-colors last:border-0 hover:bg-sand/40"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/account/quotations/${r.id}`}
                        className="font-medium text-forest hover:underline"
                      >
                        {r.reference}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-ink">
                      <span className="block">{(otherId && names.get(otherId)) ?? "A shopper"}</span>
                      <span className="text-xs text-stone">
                        {iAmSupplier ? "you quoted them" : "quoted you"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded px-2.5 py-1 text-xs font-medium ${badge.tone}`}>
                        {iAmSupplier && r.status === "sent" ? "Awaiting reply" : badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-ink-soft">
                      {r.valid_until
                        ? new Date(r.valid_until).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Not stated"}
                    </td>
                    <td className="tabular px-5 py-4 text-right font-medium text-ink">
                      {formatMinor(r.total_minor, r.currency, minor.get(r.currency) ?? 2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
