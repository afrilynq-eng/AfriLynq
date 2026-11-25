"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser, sessionClient, userCompanies } from "@/lib/supabase-server";
import {
  checkAccountNumber,
  checkPhone,
  normalisePhone,
  normaliseAccountNumber,
  type PayoutMethod,
} from "@/lib/payout-destinations";

/**
 * A supplier telling AfriLynq where to send their money.
 *
 * Everything here runs through the user's own session, never the service
 * key. payout_accounts carries row level security that limits a company to
 * its own rows, and using the session means that policy is what decides,
 * rather than a membership check written here that could drift from it.
 * The service key would bypass the policy entirely, and for a table full
 * of account numbers that is not a shortcut worth having.
 *
 * This replaces the Stripe onboarding that used to live here. That page
 * had been reading stripe_account_id since stage4-03 renamed it, so it had
 * been quietly telling every supplier their setup had not started.
 */

const back = (code: string) => redirect(`/account/payouts?saved=${code}`);

export async function savePayoutDestination(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const companies = await userCompanies();
  const company = companies[0];
  if (!company) back("nocompany");

  // A buyer-only company is paying, not being paid.
  if (company.company_type === "buyer") back("nocompany");

  const method = String(formData.get("method") ?? "bank") as PayoutMethod;
  const accountName = String(formData.get("account_name") ?? "").trim();
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();
  const countryCode = (company.country_code ?? "").toUpperCase();
  const existingId = String(formData.get("id") ?? "").trim();

  if (!accountName) back("noname");
  if (!/^[A-Z]{3}$/.test(currency)) back("nocurrency");

  const row: Record<string, unknown> = {
    company_id: company.id,
    method,
    country_code: countryCode || "NG",
    currency,
    account_name: accountName,
    is_default: true,
    // Any change to the details invalidates whatever checking was done
    // before, so a saved edit is unverified again until somebody looks.
    verified_at: null,
  };

  if (method === "bank") {
    const bankName = String(formData.get("bank_name") ?? "").trim();
    const accountNumber = String(formData.get("account_number") ?? "").trim();

    if (!bankName) back("nobank");

    const check = checkAccountNumber(accountNumber, countryCode);
    if (!check.ok) back("badnumber");

    row.bank_name = bankName;
    row.account_number = normaliseAccountNumber(accountNumber);
    // Cleared rather than left behind: a number that moved to a different
    // bank must not keep the old bank's provider code.
    row.bank_code = null;
    row.phone = null;
    row.network = null;
  } else {
    const phone = String(formData.get("phone") ?? "").trim();
    const network = String(formData.get("network") ?? "").trim();

    if (!network) back("nonetwork");

    const check = checkPhone(phone);
    if (!check.ok) back("badphone");

    row.phone = normalisePhone(phone);
    row.network = network;
    row.bank_name = null;
    row.bank_code = null;
    row.account_number = null;
  }

  const supabase = await sessionClient();

  /**
   * One default per company per currency, which the database enforces with
   * a partial unique index. So an edit updates the existing row rather
   * than inserting a second one that would be refused.
   */
  if (existingId) {
    const { error } = await supabase
      .from("payout_accounts")
      .update(row)
      .eq("id", existingId)
      .eq("company_id", company.id);

    if (error) {
      console.error("[payouts] update failed", error);
      back("error");
    }
  } else {
    const { error } = await supabase
      .from("payout_accounts")
      .insert({ ...row, created_by: user.id });

    if (error) {
      console.error("[payouts] insert failed", error);
      back(error.code === "23505" ? "duplicate" : "error");
    }
  }

  revalidatePath("/account/payouts");
  back("ok");
}

export async function removePayoutDestination(destinationId: string): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const companies = await userCompanies();
  const company = companies[0];
  if (!company) back("nocompany");

  const supabase = await sessionClient();
  const { error } = await supabase
    .from("payout_accounts")
    .delete()
    .eq("id", destinationId)
    .eq("company_id", company.id);

  if (error) {
    console.error("[payouts] delete failed", error);
    back("error");
  }

  revalidatePath("/account/payouts");
  back("removed");
}
