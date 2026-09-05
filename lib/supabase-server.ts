import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Request scoped Supabase client that carries the signed in user's session.
 *
 * Every query made through this client runs under that user's row level
 * security policies, which is the point. The service role client in
 * lib/supabase.ts bypasses them and must never be used to serve a page.
 */
export function isConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function sessionClient() {
  const store = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) =>
              store.set(name, value, options)
            );
          } catch {
            // Called from a server component, where cookies are read only.
            // Middleware refreshes the session instead.
          }
        },
      },
    }
  );
}

/**
 * Returns the signed in user only if they are a platform administrator.
 *
 * The check reads platform_role from the profiles table rather than trusting
 * anything in the session, because a JWT claim can be stale and a role is not
 * something the client should be able to assert about itself.
 */
export async function requireAdmin() {
  if (!isConfigured()) return null;
  const supabase = await sessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, platform_role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.platform_role !== "admin") return null;
  return profile;
}
