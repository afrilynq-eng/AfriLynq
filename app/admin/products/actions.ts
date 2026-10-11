"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, sessionClient } from "@/lib/supabase-server";

/**
 * Administrator control over listings.
 *
 * Suppliers publish their own listings, which is the right default: you
 * verify the company, and approving every price change would be a full
 * time job. These are the two levers that make that default safe, one for
 * taking something down and one for putting something forward.
 */

type Fail = { ok: false; message: string };
export type AdminProductResult = { ok: true } | Fail;

const STATUSES = new Set(["draft", "active", "archived"]);

export async function adminSetProductStatus(
  productId: string,
  status: string
): Promise<AdminProductResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "You are not signed in as an administrator." };
  }
  if (!STATUSES.has(status)) {
    return { ok: false, message: "Unknown status." };
  }

  // products_admin_all covers any company's row, and status is a column
  // an authenticated user may write, so this needs no function.
  const supabase = await sessionClient();
  const { error } = await supabase
    .from("products")
    .update({ status })
    .eq("id", productId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/products");
  return { ok: true };
}

export async function adminSetFeatured(
  productId: string,
  featured: boolean
): Promise<AdminProductResult> {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "You are not signed in as an administrator." };
  }

  /**
   * is_featured is not writable from the Data API by anyone, including
   * you, because an administrator signs in as 'authenticated' like every
   * other user and the column grant was revoked to stop suppliers
   * promoting themselves. The function is the way in: it runs with the
   * table owner's rights and checks is_platform_admin itself.
   */
  const supabase = await sessionClient();
  const { error } = await supabase.rpc("admin_set_product_featured", {
    p_product_id: productId,
    p_featured: featured,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/products");
  return { ok: true };
}
