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

  const { error } = await supabase
    .from("companies")
    .update({
      verification_status: decision,
      verification_notes: note || null,
      verified_at: new Date().toISOString(),
      verified_by: admin.id,
      // Approval is what puts a company in the public directory. Without
      // this an approved supplier is verified and still invisible.
      is_listed: decision === "verified",
    })
    .eq("id", companyId);

  if (error) return { ok: false, message: error.message };

  /**
   * Move the documents along with the company.
   *
   * Without this every certificate stays on "Awaiting review" forever on
   * the supplier's own page, which reads as though you never looked.
   */
  const { error: docErr } = await supabase
    .from("certifications")
    .update({
      status: decision,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
    })
    .eq("company_id", companyId)
    .eq("status", "pending");

  // A failure here is worth knowing about but must not undo the decision
  // already written above, so it is reported rather than thrown.
  if (docErr) {
    return {
      ok: false,
      message: `The company was ${decision}, but its documents could not be updated: ${docErr.message}`,
    };
  }

  revalidatePath("/admin/verification");
  revalidatePath("/admin/companies");
  revalidatePath("/admin");
  return { ok: true };
}
