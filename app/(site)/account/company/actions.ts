"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { sessionClient } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";

const LOGO_BUCKET = "company-public";

/**
 * Editing a company profile.
 *
 * The update names only the columns an owner is allowed to write, and the
 * database enforces the same list through column privileges. Sending
 * verification_status or is_listed from here would be rejected by Postgres
 * rather than quietly accepted, which is the point: the rule does not
 * depend on this file staying correct.
 */

type Fail = { ok: false; message: string };
export type SaveResult = { ok: true } | Fail;

const TYPES = new Set(["supplier", "buyer", "both"]);

const BANDS = new Set([
  "1-9",
  "10-49",
  "50-199",
  "200-499",
  "500+",
]);

export interface CompanyInput {
  companyId: string;
  legalName: string;
  tradingName: string;
  companyType: string;
  registrationNumber: string;
  taxNumber: string;
  countryCode: string;
  stateOrRegion: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
  postcode: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  shortDescription: string;
  about: string;
  yearEstablished: string;
  employeeBand: string;
}

function clean(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

/** Confirms the caller runs this company, through their own session. */
async function companyAdmin(companyId: string) {
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

  const role = (data as { member_role?: string } | null)?.member_role;
  return { user, ok: role === "owner" || role === "admin", supabase };
}

export async function saveCompany(input: CompanyInput): Promise<SaveResult> {
  const { user, ok, supabase } = await companyAdmin(input.companyId);
  if (!user) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }
  if (!ok) {
    return { ok: false, message: "You do not have permission to edit this company." };
  }

  const legalName = clean(input.legalName);
  if (!legalName) {
    return { ok: false, message: "The registered company name is required." };
  }

  const countryCode = clean(input.countryCode)?.toUpperCase() ?? null;
  if (!countryCode) {
    return { ok: false, message: "Choose the country where the business is registered." };
  }

  // A year nobody could have been established in is a typo, and stored it
  // makes the directory look careless.
  let year: number | null = null;
  const rawYear = clean(input.yearEstablished);
  if (rawYear) {
    const n = Number(rawYear);
    const thisYear = new Date().getFullYear();
    if (!Number.isInteger(n) || n < 1800 || n > thisYear) {
      return {
        ok: false,
        message: `Year established should be a year between 1800 and ${thisYear}.`,
      };
    }
    year = n;
  }

  // Someone typing their domain without a scheme is the common case, and
  // a stored bare domain renders as a broken relative link.
  let website = clean(input.websiteUrl);
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;

  const { error } = await supabase
    .from("companies")
    .update({
      legal_name: legalName,
      trading_name: clean(input.tradingName),
      company_type: TYPES.has(input.companyType) ? input.companyType : "supplier",
      registration_number: clean(input.registrationNumber),
      tax_number: clean(input.taxNumber),
      country_code: countryCode,
      state_or_region: clean(input.stateOrRegion),
      city: clean(input.city),
      address_line1: clean(input.addressLine1),
      address_line2: clean(input.addressLine2),
      postcode: clean(input.postcode),
      contact_email: clean(input.contactEmail),
      contact_phone: clean(input.contactPhone),
      website_url: website,
      short_description: clean(input.shortDescription),
      about: clean(input.about),
      year_established: year,
      employee_band: BANDS.has(input.employeeBand) ? input.employeeBand : null,
    })
    .eq("id", input.companyId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/account", "layout");
  return { ok: true };
}

/* ------------------------------------------------------------------
   The logo
   ------------------------------------------------------------------ */

export type PrepareLogoResult =
  | { ok: true; path: string; token: string }
  | Fail;

/**
 * A signed upload URL for the logo.
 *
 * Same arrangement as the document upload: the file goes straight from the
 * browser to storage rather than through a serverless function with a body
 * limit, and the path is built from the company id this server verified.
 *
 * This bucket is public, which is right for a logo that will appear in the
 * directory, so nothing private should ever be written here.
 */
export async function prepareLogo(
  companyId: string,
  fileName: string
): Promise<PrepareLogoResult> {
  const { user, ok } = await companyAdmin(companyId);
  if (!user) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }
  if (!ok) {
    return { ok: false, message: "You do not have permission to edit this company." };
  }

  const safe =
    fileName
      .normalize("NFKD")
      .replace(/[^\w.\-]/g, "-")
      .replace(/-+/g, "-")
      .slice(-60) || "logo";

  const path = `${companyId}/logo-${randomUUID()}-${safe}`;

  const { data, error } = await serviceClient()
    .storage.from(LOGO_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Could not start the upload." };
  }

  return { ok: true, path: data.path, token: data.token };
}

export async function saveLogoPath(
  companyId: string,
  path: string
): Promise<SaveResult> {
  const { user, ok, supabase } = await companyAdmin(companyId);
  if (!user) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }
  if (!ok) {
    return { ok: false, message: "You do not have permission to edit this company." };
  }

  if (!path.startsWith(`${companyId}/`)) {
    return { ok: false, message: "That file does not belong to this company." };
  }

  const { error } = await supabase
    .from("companies")
    .update({ logo_path: path })
    .eq("id", companyId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/account", "layout");
  return { ok: true };
}
