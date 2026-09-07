import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/content";
import { SITE_URL as SITE } from "@/lib/site";


export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/categories`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...CATEGORIES.map((c) => ({
      url: `${SITE}/categories/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${SITE}/for-retailers`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/for-farmers`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/register/retailer`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/register/farmer`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
