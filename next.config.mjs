/** @type {import('next').NextConfig} */
const nextConfig = {
  // Category pages are the acquisition channel, so nothing here may quietly
  // opt a route out of server rendering.
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],

    /**
     * Which hosts may be fetched through the image optimiser.
     *
     * This was { protocol: "https", hostname: "**" }, which allowed any
     * site on the internet. Two problems with that, and only one of them
     * is theoretical.
     *
     * The real one is cost. /_next/image?url=<anything> turns AfriLynq's
     * Vercel account into a free image CDN for whoever finds it, billed
     * to AfriLynq, and nothing in the application has to link to the
     * image for that to work.
     *
     * The second is that Next.js has carried advisories about SVG
     * rejection being bypassable in the optimiser, which is a far smaller
     * worry when the optimiser will only fetch from three known hosts
     * than when it will fetch from anywhere.
     *
     * Everything the platform actually renders comes from Supabase
     * storage or Unsplash. Adding a host here is a one line change; the
     * licensing rules in lib/photo-manifest.ts still govern what may
     * legitimately be used.
     */
    remotePatterns: [
      // Product photographs, company logos, verification documents.
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" },
      // Stopgap photography until AfriLynq's own exists.
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],

    // Stated rather than left to the default, so that switching it on
    // later has to be a deliberate edit somebody has to justify.
    dangerouslyAllowSVG: false,
    // An optimised image that does slip through is downloaded rather than
    // rendered in the browser, which is what stops one behaving like a
    // page on AfriLynq's own origin.
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",

    // Development only. The home page now renders 129 product images at once,
    // and putting every one through sharp exhausts the machine before the page
    // finishes. Production is untouched, so the live site still optimises.
    unoptimized: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;
