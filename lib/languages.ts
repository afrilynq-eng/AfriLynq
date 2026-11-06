/**
 * The languages offered in the header.
 *
 * Translation is machine translation through Google, which supports far
 * more languages than this. The list is deliberately short: a menu of a
 * hundred and thirty languages is harder to use than one of fourteen,
 * and these cover the markets AfriLynq actually trades between, plus the
 * European buyers it sells to.
 *
 * Codes are the ones Google's translator expects, which mostly match
 * ISO 639-1. Chinese is the exception, hence "zh-CN".
 */

export interface Language {
  /** What Google's translator calls it. */
  code: string;
  /** The name in that language, which is how a speaker of it looks. */
  label: string;
  /** In English, for the accessible name. */
  english: string;
}

export const SOURCE_LANGUAGE = "en";

export const LANGUAGES: Language[] = [
  { code: "en", label: "English", english: "English" },
  { code: "fr", label: "Français", english: "French" },
  { code: "es", label: "Español", english: "Spanish" },
  { code: "pt", label: "Português", english: "Portuguese" },
  { code: "ar", label: "العربية", english: "Arabic" },
  { code: "sw", label: "Kiswahili", english: "Swahili" },
  { code: "ha", label: "Hausa", english: "Hausa" },
  { code: "yo", label: "Yorùbá", english: "Yoruba" },
  { code: "ig", label: "Igbo", english: "Igbo" },
  { code: "am", label: "አማርኛ", english: "Amharic" },
  { code: "de", label: "Deutsch", english: "German" },
  { code: "nl", label: "Nederlands", english: "Dutch" },
  { code: "it", label: "Italiano", english: "Italian" },
  { code: "zh-CN", label: "中文", english: "Chinese" },
];

/** Right to left, so the page direction has to flip. */
export const RTL = new Set(["ar"]);

/**
 * The cookie Google's translator reads to decide what to show.
 *
 * Its format is /<from>/<to>, and setting it then reloading is a far
 * more reliable way to change language than driving the widget's own
 * hidden dropdown, which is rebuilt at unpredictable moments.
 */
export const GOOGTRANS_COOKIE = "googtrans";

export function currentLanguage(): string {
  if (typeof document === "undefined") return SOURCE_LANGUAGE;
  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${GOOGTRANS_COOKIE}=`))
    ?.split("=")[1];
  if (!raw) return SOURCE_LANGUAGE;
  const to = decodeURIComponent(raw).split("/")[2];
  return LANGUAGES.some((l) => l.code === to) ? to : SOURCE_LANGUAGE;
}

/**
 * Written for the bare host as well as the dotted form, because Google's
 * script looks for both and a cookie set on only one of them leaves the
 * page half switched.
 */
export function setLanguageCookie(code: string) {
  const host = window.location.hostname;
  const value =
    code === SOURCE_LANGUAGE ? "" : `/${SOURCE_LANGUAGE}/${code}`;
  const expiry = code === SOURCE_LANGUAGE ? "max-age=0" : "max-age=31536000";

  const write = (domain?: string) => {
    document.cookie =
      `${GOOGTRANS_COOKIE}=${value}; path=/; ${expiry}; SameSite=Lax` +
      (domain ? `; domain=${domain}` : "");
  };

  write();
  // localhost has no dots and setting a domain on it is rejected.
  if (host.includes(".")) {
    write(host);
    write(`.${host}`);
    const parts = host.split(".");
    if (parts.length > 2) write(`.${parts.slice(-2).join(".")}`);
  }
}
