import fs from "node:fs";
import path from "node:path";
import { REMOTE_PHOTOS, toImageUrl } from "./photo-manifest";

/**
 * Photograph lookup.
 *
 * The directories under public/photos are read once at build time, so adding a
 * picture is a file drop and nothing else. Name the file after the slug:
 *
 *   public/photos/categories/spices-and-botanicals.jpg
 *   public/photos/products/hibiscus.jpg
 *   public/photos/site/hero.jpg
 *
 * Any of .jpg, .jpeg, .png, .webp or .avif works. Where no photograph exists,
 * components fall back to a typographic tile rather than a broken image or a
 * grey box, so a half photographed site still looks deliberate.
 */

const EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

function index(folder: string): Map<string, string> {
  const dir = path.join(process.cwd(), "public", "photos", folder);
  const map = new Map<string, string>();

  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return map;
  }

  for (const entry of entries) {
    const ext = path.extname(entry).toLowerCase();
    if (!EXTENSIONS.includes(ext)) continue;
    const stem = path.basename(entry, ext);
    // First match wins, so a .jpg and a .webp of the same name is not a clash.
    if (!map.has(stem)) map.set(stem, `/photos/${folder}/${entry}`);
  }

  return map;
}

const categories = index("categories");
const products = index("products");
const site = index("site");

/** A local file always wins over the remote stopgap. */
function resolve(local: Map<string, string>, slug: string) {
  const file = local.get(slug);
  if (file) return file;
  const remote = REMOTE_PHOTOS[slug];
  return remote ? toImageUrl(remote) : null;
}

export function categoryPhoto(slug: string) {
  return resolve(categories, slug);
}

export function productPhoto(slug: string) {
  return resolve(products, slug);
}

export function sitePhoto(name: string) {
  return resolve(site, name);
}

/** How many photographs exist, for the build log and the readme. */
export function photoCounts() {
  return {
    categories: categories.size,
    products: products.size,
    site: site.size,
  };
}
