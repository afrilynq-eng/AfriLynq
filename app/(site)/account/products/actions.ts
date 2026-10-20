"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { sessionClient } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";

const IMAGE_BUCKET = "product-images";

/**
 * Listings.
 *
 * Writes happen here rather than in the browser, for the same reason
 * company creation does: the company a listing belongs to is taken from
 * the server's own check of membership, not from a field the client sent.
 *
 * Money is stored in minor units as a whole number. Prices entered as
 * decimals are converted using the currency's own minor_units, read from
 * the currencies table rather than assumed to be two, because that
 * assumption breaks the day somebody adds a currency where it is not.
 */

type Fail = { ok: false; message: string };
export type ProductResult = { ok: true; id: string } | Fail;
export type SimpleResult = { ok: true } | Fail;

const STATUSES = new Set(["draft", "active", "archived"]);
const INCOTERMS = new Set(["EXW", "FCA", "FOB", "CFR", "CIF", "CPT", "DAP", "DDP"]);

export interface ProductInput {
  companyId: string;
  productId?: string;
  categoryId: string;
  name: string;
  summary: string;
  description: string;
  status: string;
  unitCode: string;
  minOrderQuantity: string;
  maxMonthlyCapacity: string;
  leadTimeDays: string;
  originCountryCode: string;
  originRegion: string;
  harvestMonths: number[];
  packaging: string;
  shelfLifeDays: string;
  incoterms: string[];
  priceCurrency: string;
  priceMin: string;
  priceMax: string;
  priceIsPublic: boolean;
}

function clean(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * A positive number, or null.
 *
 * Tagged with ok rather than relying on which key is present, so the
 * compiler narrows it and a validation branch cannot be forgotten.
 */
type Parsed = { ok: true; value: number | null } | Fail;

function num(value: string | undefined, label: string): Parsed {
  const raw = clean(value);
  if (raw === null) return { ok: true, value: null };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, message: `${label} should be a number, and not a negative one.` };
  }
  return { ok: true, value: n };
}

function toSlug(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
  return `${base || "listing"}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Confirms the caller belongs to this company. */
async function member(companyId: string) {
  const supabase = await sessionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return { user: null, ok: false as const, supabase };

  const { data } = await supabase
    .from("company_members")
    .select("member_role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  return { user, ok: Boolean(data), supabase };
}

/**
 * Turn a typed price into minor units.
 *
 * Rounding rather than truncating, because 12.005 entered by a person who
 * meant twelve pounds and a halfpenny should not silently become 12.00.
 */
async function toMinor(
  supabase: Awaited<ReturnType<typeof sessionClient>>,
  currency: string | null,
  amount: string,
  label: string
): Promise<Parsed> {
  const raw = clean(amount);
  if (raw === null) return { ok: true, value: null };
  if (!currency) {
    return { ok: false, message: "Choose a currency before entering a price." };
  }

  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, message: `${label} should be a number, and not a negative one.` };
  }

  const { data } = await supabase
    .from("currencies")
    .select("minor_units")
    .eq("code", currency)
    .maybeSingle();

  const minorUnits = (data as { minor_units?: number } | null)?.minor_units ?? 2;
  return { ok: true, value: Math.round(n * 10 ** minorUnits) };
}

/** Everything both create and edit write, validated once. */
async function buildRow(
  supabase: Awaited<ReturnType<typeof sessionClient>>,
  input: ProductInput
): Promise<{ row: Record<string, unknown> } | Fail> {
  const name = clean(input.name);
  if (!name) return { ok: false, message: "Give the listing a name." };

  const categoryId = clean(input.categoryId);
  if (!categoryId) return { ok: false, message: "Choose a category." };

  const unitCode = clean(input.unitCode);
  if (!unitCode) return { ok: false, message: "Choose the unit you sell in." };

  const status = STATUSES.has(input.status) ? input.status : "draft";
  const currency = clean(input.priceCurrency);

  const moq = num(input.minOrderQuantity, "Minimum order");
  if (!moq.ok) return moq;

  const capacity = num(input.maxMonthlyCapacity, "Monthly capacity");
  if (!capacity.ok) return capacity;

  const lead = num(input.leadTimeDays, "Lead time");
  if (!lead.ok) return lead;

  const shelf = num(input.shelfLifeDays, "Shelf life");
  if (!shelf.ok) return shelf;

  const min = await toMinor(supabase, currency, input.priceMin, "The lower price");
  if (!min.ok) return min;

  const max = await toMinor(supabase, currency, input.priceMax, "The upper price");
  if (!max.ok) return max;

  // A range that runs backwards is a typo, and shown to a buyer it reads
  // as carelessness about the one thing they care about most.
  if (min.value !== null && max.value !== null && max.value < min.value) {
    return {
      ok: false,
      message: "The upper price is lower than the lower price.",
    };
  }

  return {
    row: {
      category_id: categoryId,
      name,
      summary: clean(input.summary),
      description: clean(input.description),
      status,
      unit_code: unitCode,
      min_order_quantity: moq.value,
      max_monthly_capacity: capacity.value,
      lead_time_days: lead.value === null ? null : Math.round(lead.value),
      origin_country_code: clean(input.originCountryCode)?.toUpperCase() ?? null,
      origin_region: clean(input.originRegion),
      harvest_months:
        input.harvestMonths.filter((m) => m >= 1 && m <= 12).sort((a, b) => a - b) ||
        null,
      packaging: clean(input.packaging),
      shelf_life_days: shelf.value === null ? null : Math.round(shelf.value),
      incoterms: input.incoterms.filter((i) => INCOTERMS.has(i)),
      price_currency: currency,
      price_min_minor: min.value,
      price_max_minor: max.value,
      price_is_public: Boolean(input.priceIsPublic),
      // Stamped the first time it goes live. Nothing reads it yet, but a
      // catalogue sorted by "newest" needs it and backfilling later is
      // impossible.
      published_at: status === "active" ? new Date().toISOString() : null,
    },
  };
}

export async function createProduct(input: ProductInput): Promise<ProductResult> {
  const { user, ok, supabase } = await member(input.companyId);
  if (!user) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }
  if (!ok) {
    return { ok: false, message: "You do not have permission to list for this company." };
  }

  const built = await buildRow(supabase, input);
  if ("ok" in built) return built;

  const { data, error } = await supabase
    .from("products")
    .insert({
      ...built.row,
      company_id: input.companyId,
      slug: toSlug(String(built.row.name)),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Could not create the listing." };
  }

  revalidatePath("/account/products");
  return { ok: true, id: (data as { id: string }).id };
}

export async function saveProduct(input: ProductInput): Promise<ProductResult> {
  if (!input.productId) {
    return { ok: false, message: "Which listing? No identifier was sent." };
  }

  const { user, ok, supabase } = await member(input.companyId);
  if (!user) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }
  if (!ok) {
    return { ok: false, message: "You do not have permission to edit this listing." };
  }

  const built = await buildRow(supabase, input);
  if ("ok" in built) return built;

  // published_at is only stamped on the way out of draft. Re-stamping on
  // every save would make an old listing look new each time a typo is
  // fixed.
  const { data: existing } = await supabase
    .from("products")
    .select("published_at")
    .eq("id", input.productId)
    .maybeSingle();

  const already = (existing as { published_at?: string | null } | null)?.published_at;
  if (already) built.row.published_at = already;

  const { error } = await supabase
    .from("products")
    .update(built.row)
    .eq("id", input.productId)
    .eq("company_id", input.companyId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/account/products");
  return { ok: true, id: input.productId };
}

/** Publish, unpublish or archive, from the list without opening the form. */
export async function setProductStatus(
  companyId: string,
  productId: string,
  status: string
): Promise<SimpleResult> {
  if (!STATUSES.has(status)) {
    return { ok: false, message: "Unknown status." };
  }

  const { user, ok, supabase } = await member(companyId);
  if (!user) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }
  if (!ok) {
    return { ok: false, message: "You do not have permission to change this listing." };
  }

  const patch: Record<string, unknown> = { status };
  if (status === "active") {
    const { data } = await supabase
      .from("products")
      .select("published_at")
      .eq("id", productId)
      .maybeSingle();
    if (!(data as { published_at?: string | null } | null)?.published_at) {
      patch.published_at = new Date().toISOString();
    }
  }

  const { error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", productId)
    .eq("company_id", companyId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/account/products");
  return { ok: true };
}

/**
 * Move a live listing back to the top of the catalogue.
 *
 * The catalogue and the supplier directory both order by published_at, so
 * this is a real change and not a cosmetic one: a listing added in March
 * sinks under everything added since, and renewing it brings it back up.
 *
 * Only active listings can be renewed. Renewing a draft would set a
 * publication date on something that was never published.
 */
export async function renewProduct(
  companyId: string,
  productId: string
): Promise<SimpleResult> {
  const { user, ok, supabase } = await member(companyId);
  if (!user) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }
  if (!ok) {
    return { ok: false, message: "You do not have permission to change this listing." };
  }

  const { error, count } = await supabase
    .from("products")
    .update({ published_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", productId)
    .eq("company_id", companyId)
    .eq("status", "active");

  if (error) return { ok: false, message: error.message };
  if (!count) {
    return { ok: false, message: "Only a published listing can be renewed." };
  }

  revalidatePath("/account/products");
  return { ok: true };
}

export async function deleteProduct(
  companyId: string,
  productId: string
): Promise<SimpleResult> {
  const { user, ok, supabase } = await member(companyId);
  if (!user) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }
  if (!ok) {
    return { ok: false, message: "You do not have permission to delete this listing." };
  }

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("company_id", companyId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/account/products");
  return { ok: true };
}

/* ------------------------------------------------------------------
   Photographs
   ------------------------------------------------------------------ */

export type PrepareImageResult =
  | { ok: true; path: string; token: string }
  | Fail;

/**
 * A signed upload URL for a product photograph.
 *
 * The path begins with the company id because the storage policy on this
 * bucket reads the company out of the first folder. The product id is the
 * second folder so a listing's images stay together and can be found
 * without a database read.
 */
export async function prepareProductImage(
  companyId: string,
  productId: string,
  fileName: string
): Promise<PrepareImageResult> {
  const { user, ok } = await member(companyId);
  if (!user) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }
  if (!ok) {
    return { ok: false, message: "You do not have permission to edit this listing." };
  }

  const safe =
    fileName
      .normalize("NFKD")
      .replace(/[^\w.\-]/g, "-")
      .replace(/-+/g, "-")
      .slice(-60) || "photo";

  const path = `${companyId}/${productId}/${randomUUID()}-${safe}`;

  const { data, error } = await serviceClient()
    .storage.from(IMAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Could not start the upload." };
  }

  return { ok: true, path: data.path, token: data.token };
}

export async function recordProductImage(
  companyId: string,
  productId: string,
  path: string,
  altText: string
): Promise<SimpleResult> {
  const { user, ok, supabase } = await member(companyId);
  if (!user) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }
  if (!ok) {
    return { ok: false, message: "You do not have permission to edit this listing." };
  }

  if (!path.startsWith(`${companyId}/${productId}/`)) {
    return { ok: false, message: "That file does not belong to this listing." };
  }

  // Append rather than insert at the front, so the first photograph a
  // supplier uploads stays the one buyers see in the catalogue.
  const { count } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    storage_path: path,
    alt_text: clean(altText),
    sort_order: count ?? 0,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/account/products");
  return { ok: true };
}

export async function removeProductImage(
  companyId: string,
  imageId: string
): Promise<SimpleResult> {
  const { user, ok, supabase } = await member(companyId);
  if (!user) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }
  if (!ok) {
    return { ok: false, message: "You do not have permission to edit this listing." };
  }

  // Read the path first: once the row is gone there is nothing left
  // pointing at the file, and an orphaned object in a public bucket is
  // still a publicly readable photograph.
  const { data } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("id", imageId)
    .maybeSingle();

  const path = (data as { storage_path?: string } | null)?.storage_path;

  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) return { ok: false, message: error.message };

  if (path && path.startsWith(`${companyId}/`)) {
    await serviceClient().storage.from(IMAGE_BUCKET).remove([path]);
  }

  revalidatePath("/account/products");
  return { ok: true };
}
