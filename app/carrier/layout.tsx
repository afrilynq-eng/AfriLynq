import type { Metadata } from "next";

/**
 * The carrier portal.
 *
 * Nothing on the site links here. A logistics partner reaches it because we
 * sent them the address, which keeps it out of the way rather than making it
 * secret: the sign-in and the row level policies are what actually protect
 * it. noindex stops it turning up in a search result, which is the one way
 * an unlinked page genuinely does leak.
 */
export const metadata: Metadata = {
  title: "Carrier portal",
  robots: { index: false, follow: false, nocache: true },
};

export default function CarrierLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
