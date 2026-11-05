"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, sessionClient } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";

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

export type Decision = "verified" | "rejected" | "suspended";

/**
 * The four checks the public site promises on every supplier. Keys and
 * values are both closed lists, and the database re-checks them, because
 * a free text value here would end up rendered on a supplier's badge.
 */
export type CheckKey = "registration" | "exports" | "certificates" | "contact";
export type CheckValue = "pass" | "fail" | "na";

const CHECK_KEYS: CheckKey[] = ["registration", "exports", "certificates", "contact"];
const CHECK_VALUES: CheckValue[] = ["pass", "fail", "na"];

export type DecisionResult = { ok: true } | { ok: false; message: string };

export async function decideCompany(
  companyId: string,
  decision: Decision,
  notes: string,
  checks?: Partial<Record<CheckKey, CheckValue>>
): Promise<DecisionResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "You are not signed in as an administrator." };
  }

  const note = notes.trim();

  // A negative decision with no reason is useless to the supplier and
  // generates an email to you asking what was wrong. Required.
  if (decision !== "verified" && !note) {
    return {
      ok: false,
      message:
        decision === "suspended"
          ? "Say why it is being suspended. The supplier sees this."
          : "Say why it was not accepted. The supplier sees this and acts on it.",
    };
  }

  // Keep only what the database will accept anyway. Sending a key it
  // would drop makes the admin screen and the stored record disagree,
  // which is worse than sending nothing.
  const clean: Record<string, string> = {};
  for (const key of CHECK_KEYS) {
    const value = checks?.[key];
    if (value && CHECK_VALUES.includes(value)) clean[key] = value;
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
    p_checks: Object.keys(clean).length > 0 ? clean : null,
  });

  if (error) {
    /**
     * A reviewer connected to the company they are ruling on.
     *
     * admin_decide_company refuses this, and it cannot log the attempt
     * itself: raising rolls its own audit insert back, and Postgres has no
     * autonomous transaction to escape that. So the record is written from
     * here, in a transaction of its own, after the refusal has landed.
     *
     * Service role, because the administrator's own session is not
     * trusted to write its own audit entry.
     */
    if (error.code === "42501" && /another administrator/.test(error.message)) {
      await serviceClient()
        .from("audit_log")
        .insert({
          actor_id: admin.id,
          actor_email: admin.email,
          action: "company.decision_refused",
          entity_type: "company",
          entity_id: companyId,
          after_state: {
            reason: "reviewer is connected to this company",
            attempted_status: decision,
          },
        });
    }

    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/verification");
  revalidatePath("/admin/companies");
  revalidatePath("/admin");
  return { ok: true };
}
