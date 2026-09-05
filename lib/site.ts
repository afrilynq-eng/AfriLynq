/**
 * The site's public base URL.
 *
 * Read through a helper rather than inline, because an environment variable
 * that exists but is empty is not caught by ??, and new URL("") throws. That
 * failure surfaces at build time as "Failed to collect configuration for
 * /_not-found", which points nowhere near the actual cause.
 *
 * Order: the explicit value, then the URL Vercel injects for the deployment,
 * then the production domain.
 */
function firstNonEmpty(...values: (string | undefined)[]) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

const raw = firstNonEmpty(
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  "https://afrilynq.co.uk"
);

export const SITE_URL = raw.startsWith("http") ? raw : `https://${raw}`;
