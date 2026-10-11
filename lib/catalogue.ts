import { serviceClient } from "@/lib/supabase";

/**
 * The public catalogue.
 *
 * Every read here uses the service role and applies the visibility rules
 * in the query itself rather than leaning on row level security. That is a
 * deliberate trade and worth explaining, because the opposite is usually
 * the right call.
 *
 * The reason is price_is_public. A supplier can list a product and keep
 * the price off the public page. Row level security decides which ROWS you
 * may read, not which COLUMNS, and it cannot hide a column conditionally
 * on another column in the same row. Served through the anonymous key, the
 * price is in the payload whatever the page chooses to render, and anyone
 * who opens the network tab sees it. Reading here and shaping the result
 * means the price never leaves the server unless the supplier said it
 * could.
 *
 * The cost of that trade is that these queries carry the visibility rules
 * themselves. Both conditions are applied in one place, VISIBLE_COMPANY
 * and the status filter below, and nothing in this file reads products any
 * other way.
 */

const IMAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images`;
const LOGO_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company-public`;

/** The only companies the public may see, matching companies_public_read. */
const VISIBLE_COMPANY =
  "id, slug, legal_name, trading_name, company_type, country_code, state_or_region, city, logo_path, short_description, about, year_established, employee_band, website_url, verification_status, is_listed";

export interface CatalogueCompany {
  id: string;
  slug: string | null;
  name: string;
  legalName: string;
  countryCode: string | null;
  city: string | null;
  region: string | null;
  logoUrl: string | null;
  shortDescription: string | null;
}

export interface CatalogueListing {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  categoryId: string;
  unitCode: string;
  minOrderQuantity: number | null;
  originCountryCode: string | null;
  originRegion: string | null;
  harvestMonths: number[] | null;
  /** Null when the supplier chose not to publish a price. */
  price: { currency: string; min: number | null; max: number | null } | null;
  imageUrl: string | null;
  company: CatalogueCompany;
  publishedAt: string | null;
}

export interface ListingDetail extends CatalogueListing {
  description: string | null;
  maxMonthlyCapacity: number | null;
  leadTimeDays: number | null;
  packaging: string | null;
  shelfLifeDays: number | null;
  incoterms: string[] | null;
  images: string[];
}

type CompanyRow = {
  id: string;
  slug: string | null;
  legal_name: string;
  trading_name: string | null;
  company_type: string;
  country_code: string | null;
  state_or_region: string | null;
  city: string | null;
  logo_path: string | null;
  short_description: string | null;
  about: string | null;
  year_established: number | null;
  employee_band: string | null;
  website_url: string | null;
};

function toCompany(row: CompanyRow): CatalogueCompany {
  return {
    id: row.id,
    slug: row.slug,
    name: row.trading_name || row.legal_name,
    legalName: row.legal_name,
    countryCode: row.country_code,
    city: row.city,
    region: row.state_or_region,
    logoUrl: row.logo_path ? `${LOGO_BASE}/${row.logo_path}` : null,
    shortDescription: row.short_description,
  };
}

/**
 * Minor units per currency, fetched once and reused.
 *
 * Five currencies and a page of listings would otherwise be a lookup per
 * row for a number that changes about never.
 */
let minorUnitsCache: Map<string, number> | null = null;

async function minorUnits(): Promise<Map<string, number>> {
  if (minorUnitsCache) return minorUnitsCache;
  const { data } = await serviceClient()
    .from("currencies")
    .select("code, minor_units");
  minorUnitsCache = new Map(
    ((data ?? []) as { code: string; minor_units: number }[]).map((c) => [
      c.code.trim(),
      c.minor_units,
    ])
  );
  return minorUnitsCache;
}

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  description?: string | null;
  category_id: string;
  unit_code: string;
  min_order_quantity: number | null;
  max_monthly_capacity?: number | null;
  lead_time_days?: number | null;
  packaging?: string | null;
  shelf_life_days?: number | null;
  incoterms?: string[] | null;
  origin_country_code: string | null;
  origin_region: string | null;
  harvest_months: number[] | null;
  price_currency: string | null;
  price_min_minor: number | null;
  price_max_minor: number | null;
  price_is_public: boolean;
  published_at: string | null;
  company: CompanyRow | CompanyRow[] | null;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * The price, or nothing.
 *
 * Returning null rather than a flag is the point: a caller cannot render
 * a price it was never given, so forgetting the check is not possible.
 */
function toPrice(row: ProductRow, units: Map<string, number>) {
  if (!row.price_is_public || !row.price_currency) return null;
  const code = row.price_currency.trim();
  const m = units.get(code) ?? 2;
  const div = 10 ** m;
  if (row.price_min_minor === null && row.price_max_minor === null) return null;
  return {
    currency: code,
    min: row.price_min_minor === null ? null : row.price_min_minor / div,
    max: row.price_max_minor === null ? null : row.price_max_minor / div,
  };
}

const LIST_COLUMNS = `id, slug, name, summary, category_id, unit_code, min_order_quantity, origin_country_code, origin_region, harvest_months, price_currency, price_min_minor, price_max_minor, price_is_public, published_at, company:company_id!inner (${VISIBLE_COMPANY})`;

export interface ListingQuery {
  q?: string;
  category?: string;
  country?: string;
  limit?: number;
}

/**
 * Published listings from verified, listed companies. Nothing else.
 *
 * The two conditions on the company are the same pair that
 * companies_public_read enforces, and the status filter is the one from
 * products_public_read. They are spelled out because this query runs with
 * the service role and neither policy applies to it.
 */
export async function publicListings(
  query: ListingQuery = {}
): Promise<CatalogueListing[]> {
  const svc = serviceClient();
  const limit = Math.min(query.limit ?? 60, 200);

  let q = svc
    .from("products")
    .select(LIST_COLUMNS)
    .eq("status", "active")
    .eq("company.verification_status", "verified")
    .eq("company.is_listed", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (query.category) q = q.eq("category_id", query.category);
  if (query.country) q = q.eq("origin_country_code", query.country);
  if (query.q?.trim()) {
    const needle = query.q.trim().replace(/[%,]/g, " ");
    q = q.or(`name.ilike.%${needle}%,summary.ilike.%${needle}%`);
  }

  const { data } = await q;
  const rows = (data ?? []) as unknown as ProductRow[];
  if (rows.length === 0) return [];

  const units = await minorUnits();
  const images = await firstImages(rows.map((r) => r.id));

  return rows.flatMap((row) => {
    const company = one(row.company);
    if (!company) return [];
    return [
      {
        id: row.id,
        slug: row.slug,
        name: row.name,
        summary: row.summary,
        categoryId: row.category_id,
        unitCode: row.unit_code,
        minOrderQuantity: row.min_order_quantity,
        originCountryCode: row.origin_country_code,
        originRegion: row.origin_region,
        harvestMonths: row.harvest_months,
        price: toPrice(row, units),
        imageUrl: images.get(row.id) ?? null,
        company: toCompany(company),
        publishedAt: row.published_at,
      },
    ];
  });
}

/** The lead photograph for each of these listings, in one query. */
async function firstImages(productIds: string[]): Promise<Map<string, string>> {
  if (productIds.length === 0) return new Map();

  const { data } = await serviceClient()
    .from("product_images")
    .select("product_id, storage_path, sort_order")
    .in("product_id", productIds)
    .order("sort_order", { ascending: true });

  const out = new Map<string, string>();
  for (const row of (data ?? []) as {
    product_id: string;
    storage_path: string;
  }[]) {
    if (!out.has(row.product_id)) {
      out.set(row.product_id, `${IMAGE_BASE}/${row.storage_path}`);
    }
  }
  return out;
}

const DETAIL_COLUMNS = `${LIST_COLUMNS}, description, max_monthly_capacity, lead_time_days, packaging, shelf_life_days, incoterms`;

export async function publicListing(slug: string): Promise<ListingDetail | null> {
  const { data } = await serviceClient()
    .from("products")
    .select(DETAIL_COLUMNS)
    .eq("slug", slug)
    .eq("status", "active")
    .eq("company.verification_status", "verified")
    .eq("company.is_listed", true)
    .limit(1)
    .maybeSingle();

  const row = data as unknown as ProductRow | null;
  if (!row) return null;

  const company = one(row.company);
  if (!company) return null;

  const units = await minorUnits();

  const { data: imgs } = await serviceClient()
    .from("product_images")
    .select("storage_path, sort_order")
    .eq("product_id", row.id)
    .order("sort_order", { ascending: true });

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    description: row.description ?? null,
    categoryId: row.category_id,
    unitCode: row.unit_code,
    minOrderQuantity: row.min_order_quantity,
    maxMonthlyCapacity: row.max_monthly_capacity ?? null,
    leadTimeDays: row.lead_time_days ?? null,
    packaging: row.packaging ?? null,
    shelfLifeDays: row.shelf_life_days ?? null,
    incoterms: row.incoterms ?? null,
    originCountryCode: row.origin_country_code,
    originRegion: row.origin_region,
    harvestMonths: row.harvest_months,
    price: toPrice(row, units),
    imageUrl: null,
    images: ((imgs ?? []) as { storage_path: string }[]).map(
      (i) => `${IMAGE_BASE}/${i.storage_path}`
    ),
    company: toCompany(company),
    publishedAt: row.published_at,
  };
}

export interface SupplierCard extends CatalogueCompany {
  about: string | null;
  yearEstablished: number | null;
  employeeBand: string | null;
  websiteUrl: string | null;
  companyType: string;
  listingCount: number;
}

export async function publicSuppliers(query: {
  q?: string;
  country?: string;
} = {}): Promise<SupplierCard[]> {
  const svc = serviceClient();

  let q = svc
    .from("companies")
    .select(VISIBLE_COMPANY)
    .eq("verification_status", "verified")
    .eq("is_listed", true)
    .order("legal_name", { ascending: true })
    .limit(200);

  if (query.country) q = q.eq("country_code", query.country);
  if (query.q?.trim()) {
    const needle = query.q.trim().replace(/[%,]/g, " ");
    q = q.or(
      `legal_name.ilike.%${needle}%,trading_name.ilike.%${needle}%,short_description.ilike.%${needle}%`
    );
  }

  const { data } = await q;
  const rows = (data ?? []) as CompanyRow[];
  if (rows.length === 0) return [];

  // How many live listings each one has. A directory entry with none is
  // still worth showing, but a buyer should be able to tell.
  const { data: counts } = await svc
    .from("products")
    .select("company_id")
    .eq("status", "active")
    .in("company_id", rows.map((r) => r.id));

  const byCompany = new Map<string, number>();
  for (const row of (counts ?? []) as { company_id: string }[]) {
    byCompany.set(row.company_id, (byCompany.get(row.company_id) ?? 0) + 1);
  }

  return rows.map((row) => ({
    ...toCompany(row),
    about: row.about,
    yearEstablished: row.year_established,
    employeeBand: row.employee_band,
    websiteUrl: row.website_url,
    companyType: row.company_type,
    listingCount: byCompany.get(row.id) ?? 0,
  }));
}

export interface SupplierProfile extends SupplierCard {
  listings: CatalogueListing[];
  /**
   * Only ever filled for a signed in viewer. A verified supplier's phone
   * number is the thing the whole account exists to protect: published
   * openly it is scraped within the week and the supplier blames AfriLynq
   * for the calls.
   */
  contact: { email: string | null; phone: string | null } | null;
}

export async function publicSupplier(
  slug: string,
  options: { includeContact: boolean }
): Promise<SupplierProfile | null> {
  const svc = serviceClient();

  const columns = options.includeContact
    ? `${VISIBLE_COMPANY}, contact_email, contact_phone`
    : VISIBLE_COMPANY;

  const { data } = await svc
    .from("companies")
    .select(columns)
    .eq("slug", slug)
    .eq("verification_status", "verified")
    .eq("is_listed", true)
    .maybeSingle();

  const row = data as unknown as
    | (CompanyRow & { contact_email?: string | null; contact_phone?: string | null })
    | null;
  if (!row) return null;

  const { data: products } = await svc
    .from("products")
    .select(LIST_COLUMNS)
    .eq("company_id", row.id)
    .eq("status", "active")
    .eq("company.verification_status", "verified")
    .eq("company.is_listed", true)
    .order("published_at", { ascending: false, nullsFirst: false });

  const rows = (products ?? []) as unknown as ProductRow[];
  const units = await minorUnits();
  const images = await firstImages(rows.map((r) => r.id));

  const listings: CatalogueListing[] = rows.flatMap((p) => {
    const company = one(p.company);
    if (!company) return [];
    return [
      {
        id: p.id,
        slug: p.slug,
        name: p.name,
        summary: p.summary,
        categoryId: p.category_id,
        unitCode: p.unit_code,
        minOrderQuantity: p.min_order_quantity,
        originCountryCode: p.origin_country_code,
        originRegion: p.origin_region,
        harvestMonths: p.harvest_months,
        price: toPrice(p, units),
        imageUrl: images.get(p.id) ?? null,
        company: toCompany(company),
        publishedAt: p.published_at,
      },
    ];
  });

  return {
    ...toCompany(row),
    about: row.about,
    yearEstablished: row.year_established,
    employeeBand: row.employee_band,
    websiteUrl: row.website_url,
    companyType: row.company_type,
    listingCount: listings.length,
    listings,
    contact: options.includeContact
      ? { email: row.contact_email ?? null, phone: row.contact_phone ?? null }
      : null,
  };
}

/** Category and unit names, for labelling catalogue cards. */
export async function catalogueLabels() {
  const svc = serviceClient();
  const [cats, units] = await Promise.all([
    svc.from("categories").select("id, name, slug").eq("is_active", true).order("sort_order"),
    svc.from("units").select("code, name, plural_name"),
  ]);

  return {
    categories: (cats.data ?? []) as { id: string; name: string; slug: string }[],
    units: (units.data ?? []) as {
      code: string;
      name: string;
      plural_name: string;
    }[],
  };
}
