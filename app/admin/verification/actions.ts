"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, sessionClient } from "@/lib/supabase-server";

/**
 * Approving or rejecting a company.
 *
 * requireAdmin reads platform_role out of the database rather than trusting
 * a claim in the token, so a stale session cannot approve anything.
 *
 * The writes go through the session client, not the service role,
 * deliberately. The companies table has admin policies keyed on
 * app.is_platform_admin(), which reads auth.uid(). Writing as the service
 * role would make auth.uid() null and any guard on the table would see an
 * anonymous write. Writing as the administrator means the database can see
 * who is doing it and the audit trail is true.
 */

export type Decision = "verified" | "rejected";

export type DecisionResult = { ok: true } | { ok: false; message: string };

export async function decideCompany(
  companyId: string,
  decision: Decision,
  notes: string
): Promise<DecisionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "You are not signed in as an administrator." };
  }

  const note = notes.trim();

  // A rejection with no reason is useless to the supplier and generates an
  // email to you asking what was wrong. Required.
  if (decision === "rejected" && !note) {
    return {
      ok: false,
      message: "Say why it was not accepted. The supplier sees this and acts on it.",
    };
  }

  const supabase = await sessionClient();

  /**
   * One call, one transaction.
   *
   * The company status, the listing flag and every pending document move
   * together inside the database. Done as two separate updates from here,
   * a failure between them would leave a company approved with its
   * documents still reading "Awaiting review" on the supplier's own page.
   *
   * The function also re-checks that the caller is a platform
   * administrator, so the rule holds even against a request that never
   * went through this action.
   */
  const { error } = await supabase.rpc("admin_decide_company", {
    p_company_id: companyId,
    p_status: decision,
    p_notes: note,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/verification");
  revalidatePath("/admin/companies");
  revalidatePath("/admin");
  return { ok: true };
}
