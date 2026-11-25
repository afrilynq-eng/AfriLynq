import { serviceClient } from "@/lib/supabase";
import { sendEmail, siteUrl, isEmailConfigured } from "@/lib/email";

/**
 * Telling somebody something happened.
 *
 * The notifications table has existed since September with an emailed_at
 * column, and until now nothing has written to it from the application
 * and nothing has read it. This is the write side.
 *
 * Two deliveries from one call: a row in the database, which the portal
 * shows, and an email, which is what actually reaches a supplier who is
 * not sitting in the portal. The row is written first and always. If the
 * email fails, or there is no provider configured, the row stands and
 * emailed_at simply stays null, so nothing is lost and the gap is
 * visible rather than silent.
 *
 * NOTHING HERE THROWS. Every caller is in the middle of something that
 * matters more: settling a payment, releasing a payout, recording a
 * dispute. A notification failing must never roll any of that back.
 */

export type NotificationKind =
  | "payment_received"
  | "order_paid"
  | "order_shipped"
  | "order_delivered"
  | "delivery_confirmed"
  | "payout_approved"
  | "payout_paid"
  | "dispute_raised"
  | "dispute_resolved";

interface Notice {
  /** Who it is for. */
  userId: string;
  companyId?: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Where in the portal it points, for both the row and the email button. */
  linkPath?: string;
  linkLabel?: string;
  metadata?: Record<string, unknown>;
  /** false for anything not worth an inbox. Defaults to true. */
  email?: boolean;
}

export async function notify(notice: Notice): Promise<void> {
  try {
    const svc = serviceClient();

    const { data, error } = await svc
      .from("notifications")
      .insert({
        user_id: notice.userId,
        company_id: notice.companyId ?? null,
        kind: notice.kind,
        title: notice.title,
        body: notice.body,
        link_path: notice.linkPath ?? null,
        metadata: notice.metadata ?? {},
      })
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[notify] could not record", notice.kind, error.message);
      return;
    }

    if (notice.email === false || !isEmailConfigured()) return;

    const { data: person } = await svc
      .from("profiles")
      .select("email, full_name")
      .eq("id", notice.userId)
      .maybeSingle();

    const address = (person as { email: string | null } | null)?.email;
    if (!address) return;

    const result = await sendEmail({
      to: address,
      subject: notice.title,
      text: notice.body,
      action: notice.linkPath
        ? {
            label: notice.linkLabel ?? "Open it on AfriLynq",
            url: siteUrl(notice.linkPath),
          }
        : undefined,
    });

    // Recorded so that a question about whether somebody was told has an
    // answer, rather than a shrug.
    if (result.sent && data) {
      const id = (data as { id: string }).id;
      await svc
        .from("notifications")
        .update({ emailed_at: new Date().toISOString() })
        .eq("id", id);
    }
  } catch (error) {
    console.error("[notify] failed", notice.kind, error);
  }
}

/**
 * Everyone who should hear about a company's business.
 *
 * A company is not one person. The supplier whose payment was approved
 * may not be the person who listed the product, and telling only the
 * account that happens to be on the order is how a company misses the
 * thing it most needed to know. Active members only: an invitation that
 * was never accepted is not a person to email.
 */
export async function companyMembers(companyId: string): Promise<string[]> {
  try {
    const svc = serviceClient();
    const { data } = await svc
      .from("company_members")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("status", "active");

    return ((data ?? []) as { user_id: string }[]).map((m) => m.user_id);
  } catch (error) {
    console.error("[notify] could not list members of", companyId, error);
    return [];
  }
}

/** The same notice to every active member of a company. */
export async function notifyCompany(
  companyId: string,
  notice: Omit<Notice, "userId" | "companyId">
): Promise<void> {
  const members = await companyMembers(companyId);
  await Promise.all(
    members.map((userId) => notify({ ...notice, userId, companyId }))
  );
}

/**
 * The buyer on an order, who is a company or a single person and never
 * both. stage4-04 taught orders about shoppers; anything that notifies a
 * buyer has to account for them or shoppers are never told anything.
 */
export async function notifyBuyer(
  order: { buyer_company_id: string | null; buyer_profile_id: string | null },
  notice: Omit<Notice, "userId" | "companyId">
): Promise<void> {
  if (order.buyer_company_id) {
    await notifyCompany(order.buyer_company_id, notice);
  } else if (order.buyer_profile_id) {
    await notify({ ...notice, userId: order.buyer_profile_id });
  }
}
