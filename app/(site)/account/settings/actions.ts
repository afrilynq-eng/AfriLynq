"use server";

import { revalidatePath } from "next/cache";
import { sessionClient } from "@/lib/supabase-server";

/**
 * Editing your own profile.
 *
 * Server side for the same reason company creation is: the row to update is
 * chosen from the session, not from an id the browser sends. A client that
 * can name the row it is updating can update somebody else's.
 */

export interface SettingsInput {
  firstName: string;
  lastName: string;
  phone: string;
  countryCode: string;
}

export type SettingsResult = { ok: true } | { ok: false; message: string };

function clean(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

export async function saveSettings(
  input: SettingsInput
): Promise<SettingsResult> {
  const supabase = await sessionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  if (!user) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }

  const first = clean(input.firstName);
  const last = clean(input.lastName);

  if (!first || !last) {
    return { ok: false, message: "Both your first name and last name are needed." };
  }

  // full_name is kept in step rather than left to drift. Several pages and
  // the admin lists still read it.
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: first,
      last_name: last,
      full_name: `${first} ${last}`,
      phone: clean(input.phone),
      country_code: clean(input.countryCode)?.toUpperCase() ?? null,
    })
    .eq("id", user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/account", "layout");
  return { ok: true };
}

/**
 * What you are looking for.
 *
 * Picked at sign-up and editable here, because what somebody wants to buy
 * changes more often than their name does. The slugs are checked against
 * the live categories rather than trusted: interest_slugs is read back as
 * labels on the overview, so an unchecked value would render as whatever
 * string was posted.
 *
 * Unknown slugs are dropped rather than rejected. Somebody whose saved
 * category was retired should not be told their form is invalid.
 */
export async function saveInterests(slugs: string[]): Promise<SettingsResult> {
  const supabase = await sessionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  if (!user) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }

  const wanted = Array.from(new Set((slugs ?? []).map((s) => String(s).trim()))).slice(0, 40);

  let keep: string[] = [];
  if (wanted.length > 0) {
    const { data } = await supabase
      .from("categories")
      .select("slug")
      .eq("is_active", true)
      .in("slug", wanted);
    keep = ((data ?? []) as { slug: string }[]).map((c) => c.slug);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ interest_slugs: keep.length > 0 ? keep : null })
    .eq("id", user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/account", "layout");
  return { ok: true };
}

/**
 * Changing your own password.
 *
 * The current password is asked for and checked, even though Supabase
 * would let a live session set a new one without it. A session left open
 * on a shared machine is exactly the case this guards: whoever is sitting
 * there should not be able to lock the owner out of their own account.
 *
 * The check is a sign in attempt against the user's own email. It creates
 * no second session worth worrying about, because the result is discarded
 * and the existing session cookie is untouched.
 *
 * Accounts created through Google have no password. Supabase reports that
 * as a failed sign in, which would read as "your current password is
 * wrong" and send somebody round in circles, so that case is named.
 */
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<SettingsResult> {
  const supabase = await sessionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  if (!user?.email) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }

  if (input.newPassword.length < 8) {
    return { ok: false, message: "Use at least 8 characters." };
  }

  if (input.newPassword === input.currentPassword) {
    return { ok: false, message: "That is the password you already have." };
  }

  const hasPassword = user.app_metadata?.providers?.includes("email") ?? false;
  if (!hasPassword) {
    return {
      ok: false,
      message:
        "This account signs in with Google, so it has no password to change. " +
        "Use Forgotten password on the sign in page to set one.",
    };
  }

  const { error: wrong } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.currentPassword,
  });

  if (wrong) {
    return { ok: false, message: "That is not your current password." };
  }

  const { error } = await supabase.auth.updateUser({ password: input.newPassword });

  if (error) return { ok: false, message: error.message };

  return { ok: true };
}
