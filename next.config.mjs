/** @type {import('next').NextConfig} */
const nextConfig = {
  // Category pages are the acquisition channel, so nothing here may quietly
  // opt a route out of server rendering.
  poweredByHeader: false,
  images: { formats: ["image/avif", "image/webp"] },
};

export default nextConfig;
