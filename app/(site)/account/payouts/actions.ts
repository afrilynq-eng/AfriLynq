"use server";

import { revalidatePath } from "next/cache";
import { sessionClient } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import { stripe, isStripeConfigured, payoutSupport, stripeMessage } from "@/lib/stripe";

/**
 * Getting a supplier onto Stripe, without leaving AfriLynq.
 *
 * Two steps, and they are separate on purpose.
 *
 * 1. A connected account is created once per company and never again. Its
 *    id is written to companies.stripe_account_id with the service key,
 *    because stage4-01 added that column after stage3-03 revoked
 *    table-wide select, so no signed in user can read or write it. That is
 *    deliberate: a connected account id is not something one company
 *    should be able to discover about another.
 *
 * 2. An Account Session is created every time the page loads. It is a
 *    short lived client secret that lets Stripe's own onboarding form run
 *    inside our page. It is not stored anywhere, because it expires and
 *    because a stored one is a key somebody else could use.
 *
 * Every function here checks membership through the user's OWN session
 * before touching the service key. The service key bypasses row level
 * security, so the check has to happen first and in full.
 */

type Fail = { ok: false; message: string };

export type StartResult =
  | { ok: true; clientSecret: string; accountId: string }
  | Fail;

/** Confirms the caller runs this company, through their own session. */
async function companyAdmin(companyId: string) {
  const supabase = await sessionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return { user: null, ok: false as const };

  const { data } = await supabase
    .from("company_members")
    .select("member_role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const role = (data as { member_role?: string } | null)?.member_role;
  return { user, ok: role === "owner" || role === "admin" };
}

/**
 * The company's own details, read with the service key.
 *
 * Only reached after the membership check above. The private columns are
 * needed here (country to open the account in, contact email for Stripe to
 * write to) and a signed in user cannot read them from the client.
 */
async function companyRecord(companyId: string) {
  const { data } = await serviceClient()
    .from("companies")
    .select(
      "id, legal_name, trading_name, slug, company_type, country_code, contact_email, website_url, short_description, stripe_account_id, payouts_enabled"
    )
    .eq("id", companyId)
    .maybeSingle();

  return data as {
    id: string;
    legal_name: string;
    trading_name: string | null;
    slug: string | null;
    company_type: string;
    country_code: string | null;
    contact_email: string | null;
    website_url: string | null;
    short_description: string | null;
    stripe_account_id: string | null;
    payouts_enabled: boolean;
  } | null;
}

/**
 * Creates the connected account if there is not one, then returns a fresh
 * Account Session for the embedded onboarding form.
 */
export async function startPayoutOnboarding(companyId: string): Promise<StartResult> {
  if (!isStripeConfigured()) {
    return {
      ok: false,
      message: "Payouts are not switched on yet. Nothing is wrong with your account.",
    };
  }

  const { user, ok } = await companyAdmin(companyId);
  if (!user) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }
  if (!ok) {
    return { ok: false, message: "Only an owner or admin of this company can set up payouts." };
  }

  const company = await companyRecord(companyId);
  if (!company) {
    return { ok: false, message: "We could not find that company." };
  }

  // A buyer-only company is paying, not being paid. Nothing here applies.
  if (company.company_type === "buyer") {
    return {
      ok: false,
      message: "Payouts are for selling. This company is registered as a buyer.",
    };
  }

  if (payoutSupport(company.country_code) === "unsupported") {
    return {
      ok: false,
      message:
        "Stripe cannot yet pay out to businesses registered in your country. You can still sell on AfriLynq: email info@afrilynq.co.uk and we will arrange payment another way.",
    };
  }

  const sdk = stripe();

  try {
    let accountId = company.stripe_account_id;

    if (!accountId) {
      const account = await sdk.accounts.create(
        {
          country: (company.country_code ?? "NG").toUpperCase(),
          email: company.contact_email ?? undefined,

          /**
           * The Express-equivalent shape, configured explicitly rather
           * than by account type, which is what Stripe now recommends for
           * a new platform.
           *
           * stripe_dashboard none: the supplier never sees a Stripe
           *   dashboard. Everything they need is on AfriLynq.
           * requirement_collection stripe: Stripe asks for the identity
           *   and bank details and owns the compliance for it. We are a
           *   marketplace in Port Harcourt, not a licensed KYC operation.
           * fees on the application: AfriLynq pays Stripe's fees, not the
           *   farmer. The supplier's only deduction is the 7 percent.
           * losses on stripe: Stripe refused the first version of this and
           *   its own rule says why. A dashboard of none cannot be combined
           *   with BOTH Stripe collecting requirements AND the platform
           *   carrying negative balances. One or the other. Carrying them
           *   ourselves would mean doing our own KYC, which is the thing we
           *   deliberately handed to Stripe on the line above.
           *
           *   This governs negative balances on the SUPPLIER's account.
           *   Buyers pay AfriLynq's own account, so a chargeback on a buyer
           *   payment still lands on AfriLynq, as it should.
           */
          controller: {
            stripe_dashboard: { type: "none" },
            requirement_collection: "stripe",
            fees: { payer: "application" },
            losses: { payments: "stripe" },
          },

          // transfers is what lets us send a supplier their money. We do
          // not request card_payments: buyers pay AfriLynq, and AfriLynq
          // pays the supplier.
          capabilities: { transfers: { requested: true } },

          business_profile: {
            name: company.trading_name || company.legal_name,
            url: company.website_url ?? undefined,
            product_description:
              company.short_description ?? "Agricultural produce sold through AfriLynq.",
          },

          // So a Stripe account can always be traced back to a company
          // without a lookup table.
          metadata: {
            afrilynq_company_id: company.id,
            afrilynq_company_slug: company.slug ?? "",
          },
        },
        // If the supplier double-clicks, or the action runs twice because
        // of a retry, Stripe returns the same account instead of opening a
        // second one. A duplicate connected account cannot be deleted
        // once it has been onboarded, so this matters.
        { idempotencyKey: `afl-acct-${company.id}` }
      );

      accountId = account.id;

      const { error } = await serviceClient()
        .from("companies")
        .update({ stripe_account_id: accountId })
        .eq("id", company.id);

      // If the write fails we have an orphan account at Stripe and no
      // record of it. Say so rather than carrying on, because the next
      // attempt would open another one.
      if (error) {
        return {
          ok: false,
          message:
            "Stripe created your account but we could not save it. Please email info@afrilynq.co.uk before trying again.",
        };
      }
    }

    const session = await sdk.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: { enabled: true },
        // Lets them change a bank account later without opening a support
        // ticket with us.
        account_management: { enabled: true },
        payouts: { enabled: true },
        notification_banner: { enabled: true },
      },
    });

    return { ok: true, clientSecret: session.client_secret, accountId };
  } catch (error) {
    console.error("[stripe] onboarding failed", error);
    return { ok: false, message: stripeMessage(error) };
  }
}

/**
 * Asks Stripe where the account stands and writes the answer down.
 *
 * The webhook does this too, and the webhook is the one that matters. This
 * exists because a supplier who has just finished the form wants the page
 * to say so now, not whenever the webhook lands.
 */
export async function refreshPayoutStatus(
  companyId: string
): Promise<{ ok: true; payoutsEnabled: boolean; due: string[] } | Fail> {
  if (!isStripeConfigured()) {
    return { ok: false, message: "Payouts are not switched on yet." };
  }

  const { user, ok } = await companyAdmin(companyId);
  if (!user) return { ok: false, message: "Your session has expired. Please sign in again." };
  if (!ok) return { ok: false, message: "Only an owner or admin of this company can do that." };

  const company = await companyRecord(companyId);
  if (!company?.stripe_account_id) {
    return { ok: false, message: "This company has not started payout setup yet." };
  }

  try {
    const account = await stripe().accounts.retrieve(company.stripe_account_id);

    // payouts_enabled is Stripe's own answer to "will we actually pay
    // this account". It is the only field worth storing: charges_enabled
    // and details_submitted can both be true while the money still sits.
    const enabled = Boolean(account.payouts_enabled);
    const due = account.requirements?.currently_due ?? [];

    await serviceClient()
      .from("companies")
      .update({ payouts_enabled: enabled, stripe_requirements_due: due })
      .eq("id", company.id);

    revalidatePath("/account/payouts");

    return { ok: true, payoutsEnabled: enabled, due };
  } catch (error) {
    console.error("[stripe] status refresh failed", error);
    return { ok: false, message: stripeMessage(error) };
  }
}
