"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser, sessionClient } from "@/lib/supabase-server";

/**
 * Marking them read.
 *
 * Through the user's own session, so the update policy written in
 * September (user_id = auth.uid(), with the same check on the way in) is
 * what limits it. There is no filter here saying whose rows to touch
 * because there does not need to be: the policy will not let this reach
 * anybody else's, and a filter written here could drift from it.
 */
export async function markAllRead(): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const supabase = await sessionClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) console.error("[notifications] could not mark read", error.message);

  revalidatePath("/account/notifications");
  revalidatePath("/account");
}
