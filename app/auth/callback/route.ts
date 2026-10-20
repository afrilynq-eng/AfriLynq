import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Where email confirmation and social sign-in both land.
 *
 * Supabase sends the person here with a one time code. Exchanging it sets
 * the session cookies, which is why this has to be a route handler and not
 * a page: a server component cannot write cookies.
 *
 * Used by email confirmation, password reset, and Continue with Google or
 * Microsoft. All four arrive with the same shape.
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

  /**
   * The provider refused, or the person pressed cancel on its consent
   * screen.
   *
   * The description that comes back is written by the provider and is not
   * ours to trust, so it is logged for us and never put in the URL. The
   * page shows a fixed sentence instead. Reflecting a stranger's text back
   * into our own page is how a sign-in screen ends up displaying somebody
   * else's instructions.
   */
  const providerError = searchParams.get("error");
  if (providerError) {
    console.error("OAuth callback refused", {
      error: providerError,
      description: searchParams.get("error_description"),
    });
    const denied =
      providerError === "access_denied" ? "cancelled" : "provider";
    return NextResponse.redirect(`${origin}/sign-in?error=${denied}`);
  }

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
    console.error("OAuth code exchange failed", error.message);
    return NextResponse.redirect(`${origin}/sign-in?error=link-expired`);
  }

  return response;
}
