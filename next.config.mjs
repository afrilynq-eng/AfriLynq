/** @type {import('next').NextConfig} */
const nextConfig = {
  // Category pages are the acquisition channel, so nothing here may quietly
  // opt a route out of server rendering.
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Remote photographs are a stopgap until AfriLynq's own photography
    // exists. See lib/photo-manifest.ts. Any https host is allowed so that a
    // picture can be swapped in without a config change and a restart; the
    // licensing rules in that file are what actually govern what may be used.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
