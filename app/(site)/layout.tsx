import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CookieConsent from "@/components/CookieConsent";
import Analytics from "@/components/Analytics";

/**
 * Public site chrome.
 *
 * A route group, so the administration area sits outside it and does not
 * inherit the public header, footer, cookie banner or analytics. An internal
 * screen should not carry marketing navigation, and an administrator signing
 * in should not be asked about analytics cookies.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-forest focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <CookieConsent />
      <Analytics />
    </>
  );
}
