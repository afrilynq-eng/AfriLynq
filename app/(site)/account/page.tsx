import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser, userCompanies } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

/** How a company's verification state reads to the person who owns it. */
const VERIFICATION: Record<string, { label: string; note: string }> = {
  unverified: {
    label: "Not yet submitted",
    note: "Add your certificates and company documents, then submit for verification. Nothing of yours is public until it is verified.",
  },
  pending: {
    label: "With AfriLynq for review",
    note: "We are checking your documents. You will hear from us by email.",
  },
  verified: {
    label: "Verified",
    note: "Your company can appear in the directory. Listings you publish are visible to buyers.",
  },
  rejected: {
    label: "Not accepted",
    note: "We could not verify the company on the documents supplied. Check your email for what we need.",
  },
  suspended: {
    label: "Suspended",
    note: "This company is not currently listed. Contact us if you think this is a mistake.",
  },
};

const TYPE_LABEL: Record<string, string> = {
  supplier: "Supplier",
  buyer: "Buyer",
  both: "Supplier and buyer",
};

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const companies = await userCompanies();
  const firstName = user.full_name?.split(" ")[0] ?? "there";

  return (
    <>
      <section className="border-b border-sand-deep bg-sand">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <h1 className="text-3xl sm:text-4xl">Welcome, {firstName}</h1>
          <p className="mt-3 text-ink-soft">
            Signed in as {user.email}
            {user.platform_role === "admin" && (
              <>
                {" . "}
                <Link href="/admin" className="link-quiet text-forest">
                  Go to administration
                </Link>
              </>
            )}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        {companies.length === 0 ? (
          /* ---------- No company yet ---------- */
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
        ) : (
          /* ---------- One or more companies ---------- */
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-2xl">
                {companies.length === 1 ? "Your company" : "Your companies"}
              </h2>
              <Link
                href="/account/company/new"
                className="link-quiet text-ink-soft"
              >
                Add another &rarr;
              </Link>
            </div>

            <div className="mt-7 space-y-5">
              {companies.map((c) => {
                const state =
                  VERIFICATION[c.verification_status] ??
                  VERIFICATION.unverified;
                const verified = c.verification_status === "verified";

                return (
                  <article
                    key={c.id}
                    className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl">
                          {c.trading_name || c.legal_name}
                        </h3>
                        <p className="mt-1 text-sm text-stone">
                          {TYPE_LABEL[c.company_type] ?? c.company_type}
                          {" . "}
                          You are the {c.member_role}
                        </p>
                      </div>
                      <span
                        className={
                          verified
                            ? "rounded-full bg-forest/10 px-3.5 py-1.5 text-sm font-medium text-forest"
                            : "rounded-full bg-gold/15 px-3.5 py-1.5 text-sm font-medium text-gold-deep"
                        }
                      >
                        {state.label}
                      </span>
                    </div>

                    <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
                      {state.note}
                    </p>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </>
  );
}
