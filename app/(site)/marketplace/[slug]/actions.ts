"use server";

import { revalidatePath } from "next/cache";
import { sessionClient } from "@/lib/supabase-server";

/**
 * Sending an enquiry to a supplier.
 *
 * This is the missing half of the marketplace. Until now a buyer could
 * read a listing and was handed an email address; nothing ever reached the
 * enquiries table, so the supplier's enquiry screen could never show
 * anything. One of these rows is what starts the whole chain: enquiry,
 * quotation, order.
 *
 * The supplier company and the product are taken from the listing on the
 * server. The buyer's own company comes from their membership, not from
 * the form, so a crafted post cannot send an enquiry in somebody else's
 * name. The row policy enquiries_buyer_insert enforces both again in the
 * database, which is where it actually counts.
 */

type Fail = { ok: false; message: string };
export type EnquiryResult = { ok: true; reference: string } | Fail;

export interface EnquiryInput {
  productId: string;
  supplierCompanyId: string;
  productName: string;
  unitCode: string;
  quantity: string;
  requiredBy: string;
  incoterm: string;
  deliveryCity: string;
  deliveryCountryCode: string;
  message: string;
}

const INCOTERMS = new Set(["EXW", "FCA", "FOB", "CFR", "CIF", "CPT", "DAP", "DDP"]);

function clean(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

export async function createEnquiry(input: EnquiryInput): Promise<EnquiryResult> {
  const quantity = Number(input.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, message: "Enter how much you need, as a number above zero." };
  }

  const message = (input.message ?? "").trim();
  if (message.length > 2000) {
    return { ok: false, message: "Keep the message under 2000 characters." };
  }

  const incoterm = clean(input.incoterm);
  if (incoterm && !INCOTERMS.has(incoterm)) {
    return { ok: false, message: "That is not an incoterm we recognise." };
  }

  const supabase = await sessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) {
    return { ok: false, message: "Please sign in to send an enquiry." };
  }

  // The buyer's own company. A person with no company cannot send an
  // enquiry, because the supplier needs to know who is asking.
  const { data: memberships } = await supabase
    .from("company_members")
    .select("company_id, companies!inner(id, company_type)")
    .eq("profile_id", user.id)
    .eq("status", "active");

  const rows = (memberships ?? []) as {
    company_id: string;
    companies: { id: string; company_type: string } | { id: string; company_type: string }[];
  }[];

  const one = <T,>(v: T | T[]): T | undefined => (Array.isArray(v) ? v[0] : v);

  // Prefer a buying company if they have one, so a trader who both buys and
  // sells does not send an enquiry from the wrong side of their business.
  const buying = rows.find((r) => {
    const c = one(r.companies);
    return c?.company_type === "buyer" || c?.company_type === "both";
  });
  const buyerCompanyId = (buying ?? rows[0])?.company_id;

  if (!buyerCompanyId) {
    return {
      ok: false,
      message: "Add your company before sending an enquiry, so the supplier knows who is asking.",
    };
  }

  if (buyerCompanyId === input.supplierCompanyId) {
    return { ok: false, message: "That is your own listing." };
  }

  const { data, error } = await supabase
    .from("enquiries")
    .insert({
      buyer_company_id: buyerCompanyId,
      supplier_company_id: input.supplierCompanyId,
      product_id: input.productId,
      product_name_snapshot: input.productName,
      quantity,
      unit_code: input.unitCode,
      required_by: clean(input.requiredBy),
      delivery_country_code: clean(input.deliveryCountryCode),
      delivery_city: clean(input.deliveryCity),
      incoterm,
      message: message || null,
      created_by: user.id,
    })
    .select("reference")
    .single();

  if (error) {
    // The most common cause by far is a buyer with no company, or a
    // supplier that has stopped being public since the page was loaded.
    return {
      ok: false,
      message:
        error.code === "42501"
          ? "This supplier is not accepting enquiries at the moment."
          : error.message,
    };
  }

  revalidatePath("/account/requests");
  return { ok: true, reference: (data as { reference: string }).reference };
}
