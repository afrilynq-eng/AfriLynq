import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for the browser.
 *
 * Carries the anon key only, so every query made through it runs under the
 * signed in user's row level security policies. This is the one Supabase
 * module that is safe to import into a client component. lib/supabase.ts
 * holds the service role key and must never reach the browser.
 *
 * Created per call rather than once at module scope, because a single shared
 * instance leaks a stale session between sign in and sign out within the same
 * page lifetime.
 */
export function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
