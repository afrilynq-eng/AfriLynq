"use server";

import { revalidatePath } from "next/cache";
import { sessionClient } from "@/lib/supabase-server";

/**
 * Creating a company, on the server.
 *
 * This used to run in the browser. It kept failing the companies_insert
 * policy, because the browser's Supabase client was reaching PostgREST
 * without the user's access token attached, so auth.uid() came back null and
 * created_by = auth.uid() could never be true.
 *
 * Doing it here fixes that and is the better arrangement anyway. The session
 * comes from the cookie the same way the page's own currentUser() call gets
 * it, and created_by is taken from the server's view of who is signed in
 * rather than from a field the client supplies. A client that can name its
 * own created_by is a client that can create a company owned by somebody
 * else, and no policy would catch it.
 */

const TYPES = new Set(["supplier", "buyer", "both"]);

export interface NewCompanyInput {
  companyType: string;
  legalName: string;
  tradingName: string;
  countryCode: string;
  city: string;
  registrationNumber: string;
  contactEmail: string;
  contactPhone: string;
  shortDescription: string;
}

export type CreateCompanyResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Turn a company name into a URL safe slug.
 *
 * A short random suffix is appended because slug is unique across the table
 * and two companies with the same trading name is ordinary, not an error.
 */
function toSlug(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "company"}-${suffix}`;
}

/** Empty strings are not data. Store null so the column reads honestly. */
function clean(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

export async function createCompany(
  input: NewCompanyInput
): Promise<CreateCompanyResult> {
  const supabase = await sessionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  if (!user) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }

  const legalName = clean(input.legalName);
  if (!legalName) {
    return { ok: false, message: "Your registered company name is required." };
  }

  const countryCode = clean(input.countryCode)?.toUpperCase() ?? null;
  if (!countryCode) {
    return {
      ok: false,
      message: "Please choose the country where the business is registered.",
    };
  }

  // Never trust the posted value to be one of the enum members. An invalid
  // one would reach Postgres as a cast error, which is a worse message than
  // a quiet fall back to the default the form already shows selected.
  const companyType = TYPES.has(input.companyType) ? input.companyType : "supplier";

  const tradingName = clean(input.tradingName);

  const { error } = await supabase.from("companies").insert({
    legal_name: legalName,
    trading_name: tradingName,
    slug: toSlug(tradingName ?? legalName),
    company_type: companyType,
    country_code: countryCode,
    city: clean(input.city),
    registration_number: clean(input.registrationNumber),
    contact_email: clean(input.contactEmail),
    contact_phone: clean(input.contactPhone),
    short_description: clean(input.shortDescription),
    // Set here, from the session, not from anything the browser sent.
    created_by: user.id,
  });

  if (error) {
    // Surfaced as written so a policy or constraint problem is readable
    // rather than hidden behind a friendly sentence that says nothing.
    return { ok: false, message: error.message };
  }

  // The account page lists companies, and it has just changed.
  revalidatePath("/account");
  return { ok: true };
}
