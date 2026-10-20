/**
 * Turning a code in the query string into a sentence.
 *
 * Only codes we put there ourselves are recognised. Anything else gets the
 * generic line, so a crafted link cannot make our own sign-in page display
 * a stranger's message.
 */
const MESSAGES: Record<string, string> = {
  "link-expired":
    "That link has expired or has already been used. Sign in below, or ask for a new one.",
  cancelled:
    "You cancelled before finishing. Try again, or sign in with your email and password.",
  provider:
    "That sign-in provider could not complete the request. Try again, or use your email and password.",
  "not-configured":
    "Sign in is not available on this site at the moment. Please email info@afrilynq.co.uk.",
};

export function authErrorMessage(code: string | undefined): string {
  if (!code) return "";
  return MESSAGES[code] ?? "Something went wrong signing you in. Please try again.";
}
