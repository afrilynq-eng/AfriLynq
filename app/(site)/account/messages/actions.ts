"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser, sessionClient } from "@/lib/supabase-server";

/**
 * Messages between a buyer and a supplier.
 *
 * A thread hangs off an enquiry, and there is a unique index making that
 * one thread per enquiry, so the conversation about a given request
 * stays in one place rather than forking every time somebody presses
 * Message.
 *
 * Messages are immutable by database trigger: no edit, no delete, for
 * either party. That matters the first time one of them says something
 * was never agreed.
 */

/**
 * Find the thread for an enquiry, or start it.
 *
 * Returns the thread id. The unique index means two people pressing
 * Message at the same moment cannot create two threads; the loser of
 * that race gets a duplicate key error and we simply read the winner's.
 */
export async function openEnquiryThread(enquiryId: string) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const supabase = await sessionClient();

  const { data: existing } = await supabase
    .from("message_threads")
    .select("id")
    .eq("enquiry_id", enquiryId)
    .maybeSingle();

  if (existing?.id) redirect(`/account/messages/${existing.id}`);

  // Read the enquiry through RLS: someone not party to it gets nothing,
  // which is the permission check.
  const { data: enquiry } = await supabase
    .from("enquiries")
    .select("id, reference, buyer_company_id, supplier_company_id, product_name_snapshot")
    .eq("id", enquiryId)
    .maybeSingle();

  if (!enquiry) redirect("/account/messages?error=notfound");

  const e = enquiry as unknown as {
    id: string;
    reference: string;
    buyer_company_id: string;
    supplier_company_id: string;
    product_name_snapshot: string | null;
  };

  const { data: created, error } = await supabase
    .from("message_threads")
    .insert({
      enquiry_id: e.id,
      buyer_company_id: e.buyer_company_id,
      supplier_company_id: e.supplier_company_id,
      subject: e.product_name_snapshot
        ? `${e.product_name_snapshot} (${e.reference})`
        : e.reference,
    })
    .select("id")
    .single();

  if (error || !created) {
    // Most likely the race above. Read whoever won it.
    const { data: now } = await supabase
      .from("message_threads")
      .select("id")
      .eq("enquiry_id", enquiryId)
      .maybeSingle();
    if (now?.id) redirect(`/account/messages/${now.id}`);
    redirect("/account/messages?error=create");
  }

  redirect(`/account/messages/${created.id}`);
}

export async function sendMessage(threadId: string, formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const body = String(formData.get("body") ?? "").trim();
  if (body.length === 0) {
    return { ok: false, message: "Write something first." };
  }
  if (body.length > 5000) {
    return { ok: false, message: "That is too long for one message." };
  }

  const supabase = await sessionClient();

  const { data: thread } = await supabase
    .from("message_threads")
    .select("id, buyer_company_id, supplier_company_id, is_closed")
    .eq("id", threadId)
    .maybeSingle();

  if (!thread) return { ok: false, message: "That conversation is not available." };

  const t = thread as unknown as {
    buyer_company_id: string;
    supplier_company_id: string;
    is_closed: boolean;
  };

  if (t.is_closed) {
    return { ok: false, message: "This conversation has been closed." };
  }

  /**
   * Which of the two companies is this person writing as?
   *
   * The insert policy requires sender_company_id to be one of the
   * thread's two and to be a company this user belongs to, so an
   * incorrect guess here is refused rather than mis-filed. Reading the
   * membership first simply means we send the right one.
   */
  const { data: memberships } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("status", "active");

  const mine = new Set(
    ((memberships ?? []) as { company_id: string }[]).map((m) => m.company_id)
  );

  const senderCompanyId = mine.has(t.supplier_company_id)
    ? t.supplier_company_id
    : mine.has(t.buyer_company_id)
      ? t.buyer_company_id
      : null;

  if (!senderCompanyId) {
    return { ok: false, message: "You are not part of this conversation." };
  }

  const { error } = await supabase.from("messages").insert({
    thread_id: threadId,
    sender_id: user.id,
    sender_company_id: senderCompanyId,
    body,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/account/messages/${threadId}`);
  revalidatePath("/account/messages");
  return { ok: true as const };
}
