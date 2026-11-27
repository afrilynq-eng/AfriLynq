"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";

/**
 * Creating and withdrawing carrier logins.
 *
 * This is the one place in the carrier feature that needs the service key,
 * because creating an auth user is not something a signed in session can do
 * to somebody else. Everything the carrier themselves does runs under their
 * own session.
 *
 * The password is generated here and shown once. It is not emailed: most of
 * the hauliers on this corridor are reached on WhatsApp, and an emailed
 * password sits in an inbox forever. The same reasoning as the carrier push
 * secret, which is already handled this way.
 */

const back = (code: string, extra = "") =>
  redirect(`/admin/carriers/logins?done=${code}${extra}`);

/**
 * A password somebody has to read off a screen and type into a phone.
 *
 * No l, I, 0, O or 1, because those are the characters that get
 * transcribed wrongly and turn into a support conversation.
 */
function readablePassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(18);
  let out = "";
  for (let i = 0; i < 18; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
    if (i === 5 || i === 11) out += "-";
  }
  return out;
}

export async function createCarrierLogin(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const carrierId = String(formData.get("carrier_id") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const roleTitle = String(formData.get("role_title") || "").trim() || null;

  if (!carrierId) back("nocarrier");
  if (!email || !email.includes("@")) back("bademail");

  const svc = serviceClient();

  // Already linked to a carrier? One person acts for one carrier, which is
  // what the unique constraint on carrier_users.user_id says too. Catching
  // it here gives a sentence instead of a constraint error.
  const { data: existingProfile } = await svc
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  const existingId = (existingProfile as { id: string } | null)?.id ?? null;

  if (existingId) {
    const { data: alreadyLinked } = await svc
      .from("carrier_users")
      .select("id")
      .eq("user_id", existingId)
      .maybeSingle();
    if (alreadyLinked) back("alreadylinked");
  }

  let userId = existingId;
  let password: string | null = null;

  if (!userId) {
    password = readablePassword();
    const { data: created, error } = await svc.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { carrier_login: true },
    });

    if (error || !created?.user) {
      console.error("createUser", error?.message);
      back("createfailed");
      return; // back() redirects, but saying so lets the narrowing below hold
    }
    userId = created.user.id;
  }

  const { error: linkError } = await svc.from("carrier_users").insert({
    carrier_id: carrierId,
    user_id: userId,
    role_title: roleTitle,
    invited_by: admin.id,
  });

  if (linkError) {
    console.error("carrier_users insert", linkError.message);
    back("linkfailed");
  }

  revalidatePath("/admin/carriers/logins");

  // The password goes back in the URL so it can be shown once. It is never
  // stored anywhere, so if this page is closed it has to be reset.
  back(
    password ? "created" : "linked",
    password ? `&pw=${encodeURIComponent(password)}&em=${encodeURIComponent(email)}` : ""
  );
}

export async function setLoginActive(
  linkId: string,
  active: boolean
): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const svc = serviceClient();
  const { error } = await svc
    .from("carrier_users")
    .update({ active })
    .eq("id", linkId);

  if (error) {
    console.error("carrier_users update", error.message);
    back("updatefailed");
  }

  revalidatePath("/admin/carriers/logins");
  back(active ? "reinstated" : "withdrawn");
}

/** A new password for somebody who has lost theirs. */
export async function resetCarrierPassword(userId: string): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const password = readablePassword();
  const svc = serviceClient();

  const { data, error } = await svc.auth.admin.updateUserById(userId, { password });
  if (error) {
    console.error("updateUserById", error.message);
    back("resetfailed");
  }

  revalidatePath("/admin/carriers/logins");
  back(
    "reset",
    `&pw=${encodeURIComponent(password)}&em=${encodeURIComponent(data?.user?.email ?? "")}`
  );
}
