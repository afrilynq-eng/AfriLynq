"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, sessionClient } from "@/lib/supabase-server";

/**
 * Settling prices, and letting carrier updates through to the buyer.
 *
 * Both go through database functions that check for admin themselves, so
 * these run on the signed in session rather than the service key. The
 * requireAdmin here is to send a signed out person to the login page, not
 * to be the gate. The gate is in the database.
 */

const back = (code: string) => redirect(`/admin/freight?done=${code}`);

function toMinor(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const major = Number(cleaned);
  if (!Number.isFinite(major) || major < 0) return null;
  return Math.round(major * 100);
}

export async function respondToPrice(
  proposalId: string,
  formData: FormData
): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const action = String(formData.get("action") || "");
  const counter = toMinor(formData.get("counter"));
  const note = String(formData.get("note") || "").trim() || null;

  if (action === "counter" && counter === null) back("badcounter");

  const supabase = await sessionClient();
  const { error } = await supabase.rpc("admin_respond_to_proposal", {
    p_proposal_id: proposalId,
    p_action: action,
    p_counter_minor: action === "counter" ? counter : null,
    p_note: note,
  });

  if (error) {
    console.error("admin_respond_to_proposal", error.message);
    back("pricefailed");
  }

  revalidatePath("/admin/freight");
  revalidatePath("/admin/shipments");
  back(action === "accept" ? "priceagreed" : action === "reject" ? "pricerejected" : "countersent");
}

export async function reviewEvent(
  eventId: string,
  approve: boolean,
  formData: FormData
): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const note = String(formData.get("note") || "").trim() || null;

  const supabase = await sessionClient();
  const { error } = await supabase.rpc("admin_review_event", {
    p_event_id: eventId,
    p_approve: approve,
    p_note: note,
  });

  if (error) {
    console.error("admin_review_event", error.message);
    back("reviewfailed");
  }

  revalidatePath("/admin/freight");
  revalidatePath("/admin/shipments");
  back(approve ? "eventapproved" : "eventrejected");
}
