"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { readConsent } from "@/lib/consent";

/**
 * Google Analytics, loaded only after consent.
 *
 * The script tag is not rendered at all until the consent cookie says granted,
 * so declining means the request is never made rather than made and ignored.
 * If the measurement ID is not set, nothing loads either way.
 */
export default function Analytics() {
  const [granted, setGranted] = useState(false);
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    setGranted(readConsent() === "granted");
    const onChange = (e: Event) =>
      setGranted((e as CustomEvent).detail === "granted");
    window.addEventListener("afrilynq:consent", onChange);
    return () => window.removeEventListener("afrilynq:consent", onChange);
  }, []);

  if (!id || !granted) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
