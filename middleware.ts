import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie on signed in routes.
 *
 * Without this the access token expires mid session and the area starts
 * bouncing people to the sign in page for no visible reason.
 *
 * This refreshes only. It does not decide who may see what. Each page does
 * that for itself through requireAdmin or currentUser, because the answer
 * depends on a database read of platform_role and company membership, and the
 * edge is the wrong place to be querying for that.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without configuration there is no session to refresh. Pass the request
  // through rather than throwing, so a missing .env.local shows a readable
  // message on the page instead of a 500 from the edge.
  if (!url || !key) return response;

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/dashboard/:path*"],
};
