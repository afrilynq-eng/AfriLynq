"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { sessionClient } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";

const BUCKET = "company-documents";

/**
 * Uploading company documents.
 *
 * The file does not travel through this server. The browser asks for a
 * signed upload URL, then sends the file straight to Supabase Storage. Two
 * reasons: a serverless function has a body limit well under the bucket's
 * 10MB, so a large certificate posted through an action would simply fail,
 * and pushing megabytes through the app for no reason is waste.
 *
 * The signed URL is minted with the service role, which bypasses storage
 * policies. That is deliberate and the authorisation is done here instead,
 * explicitly, before the URL exists: the caller must be an active owner or
 * admin of the company, and the storage path is built from the company id
 * this server verified rather than anything the browser sent. So a signed
 * URL can only ever point inside the caller's own folder.
 */

type Fail = { ok: false; message: string };

const NOT_YOURS: Fail = {
  ok: false,
  message: "You do not have permission to manage documents for this company.",
};

const NO_SESSION: Fail = {
  ok: false,
  message: "Your session has expired. Please sign in again.",
};

/**
 * Confirms the caller runs this company.
 *
 * The read goes through the session client, so row level security applies to
 * the membership lookup itself and a company the caller cannot see returns
 * nothing rather than a row.
 */
async function companyAdmin(companyId: string) {
  const supabase = await sessionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return { user: null, ok: false as const };

  const { data } = await supabase
    .from("company_members")
    .select("member_role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const role = (data as { member_role?: string } | null)?.member_role;
  return { user, ok: role === "owner" || role === "admin" };
}

/** Strip anything that would make an awkward object key. */
function safeName(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w.\- ]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(-80) || "document"
  );
}

export type PrepareResult =
  | { ok: true; path: string; token: string }
  | Fail;

export async function prepareUpload(
  companyId: string,
  fileName: string
): Promise<PrepareResult> {
  const { user, ok } = await companyAdmin(companyId);
  if (!user) return NO_SESSION;
  if (!ok) return NOT_YOURS;

  const path = `${companyId}/${randomUUID()}-${safeName(fileName)}`;

  const { data, error } = await serviceClient()
    .storage.from(BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Could not start the upload." };
  }

  return { ok: true, path: data.path, token: data.token };
}

export interface RecordInput {
  companyId: string;
  path: string;
  name: string;
  issuingBody: string;
  reference: string;
  issuedOn: string;
  expiresOn: string;
}

export type RecordResult = { ok: true } | Fail;

function clean(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

export async function recordDocument(
  input: RecordInput
): Promise<RecordResult> {
  const { user, ok } = await companyAdmin(input.companyId);
  if (!user) return NO_SESSION;
  if (!ok) return NOT_YOURS;

  const name = clean(input.name);
  if (!name) return { ok: false, message: "Give the document a name." };

  // The path is checked against the company rather than trusted, so a
  // tampered request cannot attach someone else's file to this company.
  if (!input.path.startsWith(`${input.companyId}/`)) {
    return { ok: false, message: "That file does not belong to this company." };
  }

  const supabase = await sessionClient();
  const { error } = await supabase.from("certifications").insert({
    company_id: input.companyId,
    name,
    issuing_body: clean(input.issuingBody),
    reference: clean(input.reference),
    document_path: input.path,
    issued_on: clean(input.issuedOn),
    expires_on: clean(input.expiresOn),
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/account", "layout");
  return { ok: true };
}

export type SubmitResult = { ok: true } | Fail;

/**
 * Hand the company to AfriLynq for checking.
 *
 * Refused with nothing uploaded, because an empty submission wastes a review
 * and leaves the supplier waiting on a decision that cannot be made.
 */
export async function submitForVerification(
  companyId: string
): Promise<SubmitResult> {
  const { user, ok } = await companyAdmin(companyId);
  if (!user) return NO_SESSION;
  if (!ok) return NOT_YOURS;

  const supabase = await sessionClient();

  /**
   * The move to 'pending' happens inside the database.
   *
   * verification_status is not writable from the Data API by anyone: if it
   * were, a supplier could set their own company to verified and listed
   * without a document ever being looked at. The function runs with the
   * table owner's rights and checks for itself that the caller manages
   * this company and that something has actually been uploaded.
   */
  const { error } = await supabase.rpc("submit_company_for_verification", {
    p_company_id: companyId,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/account", "layout");
  return { ok: true };
}
