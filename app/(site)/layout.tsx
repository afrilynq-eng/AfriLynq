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
      {/* focus-visible, not focus.

          With plain `focus:`, clicking anywhere near the top left corner
          of the page gives this link focus and the black box appears and
          stays there until something else is clicked. It looks like a
          rendering fault, and it is what Collins has been seeing.

          focus-visible only fires when the browser judges the focus to
          have come from the keyboard, which is the only case this link
          exists for. A keyboard user pressing Tab still gets it; a mouse
          user never sees it again. */}
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:bg-forest focus-visible:px-4 focus-visible:py-2 focus-visible:text-paper"
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
