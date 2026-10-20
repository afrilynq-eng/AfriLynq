"use server";

import { revalidatePath } from "next/cache";
import { sessionClient } from "@/lib/supabase-server";

/**
 * Answering an enquiry.
 *
 * Only the status side lives here. Sending a quotation is the Stage 3
 * piece and needs the quotation builder, which does not exist yet.
 *
 * The company is checked on the server rather than trusted from the form,
 * and the update is scoped to the supplier side of the row so that posting
 * a crafted enquiry id cannot close somebody else's enquiry.
 */

type Fail = { ok: false; message: string };
export type SimpleResult = { ok: true } | Fail;

async function supplierCompanyIds(): Promise<string[]> {
  const supabase = await sessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return [];

  const { data } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("profile_id", user.id)
    .eq("status", "active");

  return ((data ?? []) as { company_id: string }[]).map((r) => r.company_id);
}

export async function declineEnquiry(
  enquiryId: string,
  reason: string
): Promise<SimpleResult> {
  const trimmed = reason.trim();
  if (trimmed.length > 300) {
    return { ok: false, message: "Keep the reason under 300 characters." };
  }

  const ids = await supplierCompanyIds();
  if (ids.length === 0) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }

  const supabase = await sessionClient();
  const { error, count } = await supabase
    .from("enquiries")
    .update(
      {
        status: "closed",
        closed_reason: trimmed || "Declined by the supplier.",
        first_response_at: new Date().toISOString(),
      },
      { count: "exact" }
    )
    .eq("id", enquiryId)
    .in("supplier_company_id", ids)
    .in("status", ["open", "quoted"]);

  if (error) return { ok: false, message: error.message };
  if (!count) {
    return { ok: false, message: "That enquiry is not open, or is not yours." };
  }

  revalidatePath("/account/enquiries");
  return { ok: true };
}
