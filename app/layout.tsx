import type { Metadata } from "next";
import localFont from "next/font/local";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CookieConsent from "@/components/CookieConsent";
import Analytics from "@/components/Analytics";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

/**
 * One family, two width axes. Headlines are set expanded and body text normal,
 * which gives the page its typographic contrast without a second typeface.
 *
 * Self hosted rather than loaded from Google. A font request to a third party
 * is a third party request, and on a United Kingdom site that is a cookie
 * notice question we do not need to have.
 */
const archivo = localFont({
  src: "./fonts/archivo-variable.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AfriLynq: source agricultural produce from Africa",
    template: "%s | AfriLynq",
  },
  description:
    "AfriLynq connects agricultural producers across Africa with buyers in the United Kingdom. Browse what is in season, tell us what you need, and we introduce you to suppliers who can supply it.",
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "AfriLynq",
    url: SITE_URL,
    title: "AfriLynq: source agricultural produce from Africa",
    description:
      "A sourcing platform connecting African producers with buyers in the United Kingdom.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organisation = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "AfriLynq",
    url: SITE_URL,
    email: "hello@afrilynq.co.uk",
    description:
      "A sourcing platform connecting agricultural producers across Africa with buyers in the United Kingdom.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "58 Rockfield Road, Anfield",
      addressLocality: "Liverpool",
      addressCountry: "GB",
    },
  };

  return (
    <html lang="en-GB" className={archivo.variable}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <CookieConsent />
        <Analytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organisation) }}
        />
      </body>
    </html>
  );
}
