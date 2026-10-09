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
