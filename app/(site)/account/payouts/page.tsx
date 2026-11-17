import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { userCompanies } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import { payoutSupport, isStripeConfigured, isTestMode } from "@/lib/stripe";
import { SERVICE_CHARGE_PERCENT, SERVICE_CHARGE_NAME } from "@/lib/fees";
import PayoutOnboarding from "@/components/account/PayoutOnboarding";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Getting paid",
  robots: { index: false, follow: false },
};

/**
 * Where a supplier sets up getting paid.
 *
 * The page reads stripe_account_id and payouts_enabled with the service
 * key. It has to: stage4-01 added those columns after stage3-03 revoked
 * table-wide select on companies, so a signed in user cannot read them,
 * which is the point. The company ids come from userCompanies(), which
 * ran under the user's own row level security, so the read below is
 * already limited to companies this person belongs to.
 */
export default async function PayoutsPage() {
  const companies = await userCompanies();
  const company = companies[0];
  if (!company) redirect("/account");

  // A buyer-only company is paying, not being paid.
  if (company.company_type === "buyer") redirect("/account");

  const configured = isStripeConfigured();

  const { data } = configured
    ? await serviceClient()
        .from("companies")
        .select("stripe_account_id, payouts_enabled, stripe_requirements_due")
        .eq("id", company.id)
        .maybeSingle()
    : { data: null };

  const record = data as {
    stripe_account_id: string | null;
    payouts_enabled: boolean | null;
    stripe_requirements_due: string[] | null;
  } | null;

  const hasAccount = Boolean(record?.stripe_account_id);
  const payoutsEnabled = Boolean(record?.payouts_enabled);
  const support = payoutSupport(company.country_code);

  const state = payoutsEnabled
    ? { label: "Ready to be paid", tone: "bg-forest/10 text-forest" }
    : hasAccount
      ? { label: "Setup not finished", tone: "bg-gold/15 text-gold-deep" }
      : { label: "Not started", tone: "bg-sand-deep text-ink-soft" };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl">Getting paid</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
              A buyer pays AfriLynq when they accept your quotation, and we hold the money
              until the goods are confirmed delivered. This is where you tell us which
              account to send it to.
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${state.tone}`}>
            {state.label}
          </span>
        </div>

        {isTestMode() && (
          <p className="mt-5 rounded-lg border border-gold/30 bg-gold/10 px-4 py-2.5 text-xs text-gold-deep">
            Test mode. Nothing here moves real money, and any details you enter are not
            kept.
          </p>
        )}
      </div>

      {/* A supplier whose company is not verified cannot sell yet, so
          setting up payouts would be work with nothing at the end of it.
          Said here rather than letting them finish and wonder. */}
      {company.verification_status !== "verified" && (
        <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
          <h2 className="text-lg">Verification comes first</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Your company is not verified yet, so nothing of yours is on sale and there is
            nothing to pay out. You can still set up payouts now if you would rather have
            it done, but the order that matters is verification first.
          </p>
          <Link
            href="/account/documents"
            className="mt-4 inline-block rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest/90"
          >
            Documents and verification
          </Link>
        </div>
      )}

      {support === "unsupported" ? (
        <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
          <h2 className="text-lg">We will pay you another way</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Stripe, who handle the money on AfriLynq, cannot yet pay out to businesses
            registered in your country. This changes nothing about selling: you can list,
            be enquired with, quote and be accepted exactly as before. When your first
            order completes we will arrange payment directly and confirm the details with
            you first.
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            Email{" "}
            <a className="font-semibold text-forest underline" href="mailto:info@afrilynq.co.uk">
              info@afrilynq.co.uk
            </a>{" "}
            and we will set it up.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
          {!configured ? (
            <p className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold-deep">
              Payouts are not switched on yet. Nothing is wrong with your account, and we
              will email you when this is ready.
            </p>
          ) : (
            <>
              <h2 className="text-lg">
                {payoutsEnabled ? "Your payout account" : "Set up your payout account"}
              </h2>

              {support === "unknown" && !hasAccount && (
                <p className="mt-3 max-w-2xl rounded-lg border border-gold/30 bg-gold/10 px-4 py-2.5 text-xs text-gold-deep">
                  We have not yet confirmed that Stripe pays out to{" "}
                  {company.country_code ?? "your country"}. Start the setup and it will say
                  so straight away if not, and we will arrange payment another way.
                </p>
              )}

              <div className="mt-5">
                <PayoutOnboarding
                  companyId={company.id}
                  hasAccount={hasAccount}
                  payoutsEnabled={payoutsEnabled}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* The deduction, stated before anybody has earned anything, which is
          the only honest moment to state it. */}
      <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
        <h2 className="text-lg">What reaches you</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          AfriLynq deducts the {SERVICE_CHARGE_NAME} of {SERVICE_CHARGE_PERCENT} percent
          from the sale value. On a sale of £1,000 that is £
          {((1000 * SERVICE_CHARGE_PERCENT) / 100).toFixed(2)}, and £
          {(1000 - (1000 * SERVICE_CHARGE_PERCENT) / 100).toFixed(2)} reaches you. Stripe
          take their own fee from AfriLynq, not from you.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Money is released when delivery is confirmed, not when it is collected. Nobody is
          charged anything until there are completed orders to charge on.
        </p>
      </div>
    </div>
  );
}
