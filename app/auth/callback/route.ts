import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Where the confirmation email lands.
 *
 * Supabase sends the user here with a one time code. Exchanging it sets the
 * session cookies, which is why this has to be a route handler and not a
 * page: a server component cannot write cookies.
 *
 * Also used by password reset, which arrives with the same shape.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Only ever redirect to a path on this site. An open redirect here would
  // let someone send a confirmation link that lands on their own domain with
  // the session already established.
  const requested = searchParams.get("next") ?? "/account";
  const next = requested.startsWith("/") && !requested.startsWith("//")
    ? requested
    : "/account";

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=link-expired`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.redirect(`${origin}/sign-in?error=not-configured`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) =>
        list.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        ),
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/sign-in?error=link-expired`);
  }

  return response;
}
