/**
 * Cookie consent state.
 *
 * Stored in a first party cookie rather than localStorage so the server can
 * read it too if that becomes useful later, and so it expires on a schedule we
 * control. The only values are "granted" and "denied". Absence means we have
 * not asked yet, which is not the same as denied and must not be treated as
 * consent.
 */
export const CONSENT_COOKIE = "afrilynq_consent";
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 182; // about six months

export type Consent = "granted" | "denied" | null;

export function readConsent(): Consent {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CONSENT_COOKIE}=`));
  const value = match?.split("=")[1];
  return value === "granted" || value === "denied" ? value : null;
}

export function writeConsent(value: Exclude<Consent, null>) {
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${CONSENT_MAX_AGE}; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent("afrilynq:consent", { detail: value }));
}

export function clearConsent() {
  document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent("afrilynq:consent", { detail: null }));
}
