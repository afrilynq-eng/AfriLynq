"use server";

import { revalidatePath } from "next/cache";
import { createOrderForQuotation } from "@/app/(site)/account/orders/actions";
import { redirect } from "next/navigation";
import { currentUser, sessionClient } from "@/lib/supabase-server";

/**
 * The buyer's answer.
 *
 * No permission check is written here on purpose. quotations_party_update
 * already says a buyer may update only while the status is 'sent', so an
 * attempt to accept a quotation that was already rejected, or one
 * belonging to somebody else, matches no row and changes nothing. A
 * second check in application code would be a second thing to get wrong
 * and would not be the one actually enforcing anything.
 *
 * What is checked here is that the answer is one of the two allowed, so
 * a crafted form cannot post an arbitrary status.
 */

export async function respondToQuotation(
  quotationId: string,
  decision: "accepted" | "rejected",
  formData: FormData
) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  if (decision !== "accepted" && decision !== "rejected") {
    return { ok: false, message: "Unknown decision." };
  }

  const reason = String(formData.get("reason") ?? "").trim();
  if (decision === "rejected" && reason.length === 0) {
    return {
      ok: false,
      message: "Please say briefly why, so the supplier can quote again usefully.",
    };
  }

  const supabase = await sessionClient();

  const { data, error } = await supabase
    .from("quotations")
    .update({
      status: decision,
      responded_at: new Date().toISOString(),
      decline_reason: decision === "rejected" ? reason : null,
    })
    .eq("id", quotationId)
    .eq("status", "sent")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data) {
    return {
      ok: false,
      message:
        "That quotation can no longer be answered. It may have been answered already, or withdrawn.",
    };
  }

  /**
   * Accepting creates the order, and nothing more.
   *
   * The order is created here rather than when the buyer pays, so an
   * acceptance at eleven at night is a real thing the supplier can see
   * even if the buyer pays in the morning. It sits at awaiting_payment
   * until the money arrives.
   *
   * A failure to create it does not undo the acceptance. The quotation is
   * genuinely accepted, both parties were told, and pretending otherwise
   * because of our own error would be worse than an order we have to
   * create by hand.
   */
  if (decision === "accepted") {
    const created = await createOrderForQuotation(quotationId, user.id);
    if (!created.ok) {
      console.error("[quotations] accepted but no order", quotationId, created.message);
    }
    revalidatePath("/account/orders");
  }

  revalidatePath("/account/quotations");
  revalidatePath(`/account/quotations/${quotationId}`);
  return { ok: true as const };
}
