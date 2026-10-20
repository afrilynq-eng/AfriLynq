import type { Metadata } from "next";
import Link from "next/link";
import OverviewExtras from "@/components/account/OverviewExtras";
import { userCompanies } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

const TYPE_LABEL: Record<string, string> = {
  supplier: "Supplier",
  buyer: "Buyer",
  both: "Supplier and buyer",
};

const STATUS_LABEL: Record<string, string> = {
  unverified: "Not yet submitted",
  pending: "In review",
  verified: "Verified",
  rejected: "Not accepted",
  suspended: "Suspended",
};

export default async function AccountPage() {
  const companies = await userCompanies();

  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-sand-deep bg-paper p-8 shadow-sm">
        <h2 className="text-2xl">Set up your company</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Everything on AfriLynq happens through a company rather than a
          personal account. Create yours and you can add listings, upload
          certificates and send or answer enquiries.
        </p>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
          It takes two minutes, and you can change any of it later.
        </p>
        <Link
          href="/account/company/new"
          className="btn-lift btn-primary mt-7 inline-block"
        >
          Create my company
        </Link>
      </div>
    );
  }

  const [primary, ...others] = companies;

  return (
    <>
      <OverviewExtras companyIds={companies.map((c) => c.id)} primary={primary} />

      {/* Several companies is rare, and the overview above follows the first.
          The rest are listed plainly so they are reachable, not repeated in
          full, which would make the page a wall of near-identical cards. */}
      {others.length > 0 && (
        <section className="mt-6 rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-xl">Your other companies</h2>
            <Link href="/account/company/new" className="link-quiet text-sm text-ink-soft">
              Add another &rarr;
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-sand-deep border-t border-sand-deep">
            {others.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3.5"
              >
                <span className="min-w-0">
                  <span className="block text-ink">{c.trading_name || c.legal_name}</span>
                  <span className="text-sm text-stone">
                    {TYPE_LABEL[c.company_type] ?? c.company_type}
                    {" · "}
                    {STATUS_LABEL[c.verification_status] ?? c.verification_status}
                  </span>
                </span>
                <Link href="/account/company" className="link-quiet shrink-0 text-sm text-forest">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {others.length === 0 && (
        <p className="mt-6 text-sm text-stone">
          Trading under a second company?{" "}
          <Link href="/account/company/new" className="link-quiet text-forest">
            Add another
          </Link>
          .
        </p>
      )}
    </>
  );
}
