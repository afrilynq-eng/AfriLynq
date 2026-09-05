import { createClient } from "@supabase/supabase-js";

/**
 * Server side client using the service role key.
 *
 * The leads table has an insert policy for anon and no select policy, so
 * anonymous inserts would work with the public key alone. We use the service
 * role here anyway because the route handler adds the source and UTM fields
 * and because it keeps every write to the database going through one place we
 * control. This module must never be imported into a client component.
 */
export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
