"use server";

import { redirect } from "next/navigation";
import { currentUser, sessionClient } from "@/lib/supabase-server";

/**
 * Record what a new account is here to do.
 *
 * Only reachable by somebody who has no account_type yet, which in
 * practice means they signed in with Google or Microsoft. The sign-up
 * forms set this at registration; a social sign-in carries no such
 * answer, because the provider has no idea whether the person is a farm
 * or a shopper.
 */

const ALLOWED = new Set(["supplier", "buyer", "shopper"]);

export async function chooseRole(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const choice = String(formData.get("accountType") ?? "");
  if (!ALLOWED.has(choice)) {
    redirect("/welcome?error=pick");
  }

  /**
   * Set once, never changed here.
   *
   * This page exists to fill a gap, not to be a role switcher. Somebody
   * who already answered must not be able to rewrite it by coming back
   * to this URL, so the update is conditional on the column still being
   * empty. Changing an existing answer is a support job, deliberately,
   * because a supplier turning themselves into a shopper would strand
   * their company and their listings.
   */
  const supabase = await sessionClient();
  const { error } = await supabase
    .from("profiles")
    .update({ account_type: choice })
    .eq("id", user.id)
    .is("account_type", null);

  if (error) {
    // The wrapper in lib/db-report.ts has already logged the detail.
    redirect("/welcome?error=save");
  }

  redirect(choice === "shopper" ? "/account" : "/account/company/new");
}
