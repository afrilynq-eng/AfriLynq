import { createClient } from "@supabase/supabase-js";
import { reporting } from "@/lib/db-report";

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

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // reporting() makes a failed query say so in the log instead of
  // returning null and letting the caller's `?? []` turn it into a
  // convincing empty page. See lib/db-report.ts.
  return reporting(client);
}
