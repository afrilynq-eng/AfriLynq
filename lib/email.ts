/**
 * Sending email.
 *
 * Built the same way as lib/flutterwave.ts and for the same reason: with
 * no key configured every function here does nothing and says so, rather
 * than throwing. A platform that cannot send email should still take
 * payments.
 *
 * Resend's REST API directly rather than their SDK. One POST, no
 * dependency, nothing to keep up to date, and the whole surface we use is
 * the twenty lines below.
 *
 * TURNING IT ON
 *   1. A Resend account, free to 3,000 emails a month
 *   2. Verify afrilynq.co.uk there, which gives three DNS records
 *   3. RESEND_API_KEY in Vercel, and optionally EMAIL_FROM
 *
 * Until step 3 the platform records every notification in the database
 * and simply does not post it. Nothing is lost; when the key appears, new
 * notifications start arriving by email.
 */

const API = "https://api.resend.com/emails";

/** Who it comes from. Must be on a domain verified with the provider. */
export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "AfriLynq <info@afrilynq.co.uk>";

export const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO ?? "info@afrilynq.co.uk";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export interface Email {
  to: string;
  subject: string;
  /** The plain text body. Always required; the HTML is built from it. */
  text: string;
  /** Optional call to action, rendered as a button in the HTML version. */
  action?: { label: string; url: string };
}

export type SendResult =
  | { sent: true; id: string }
  | { sent: false; reason: "not-configured" | "no-address" | "failed"; detail?: string };

/**
 * Send one email.
 *
 * Never throws. Every caller is in the middle of something that matters
 * more than the email: settling a payment, releasing a payout, recording
 * a dispute. An email provider having a bad afternoon must not roll back
 * a supplier's money.
 */
export async function sendEmail(email: Email): Promise<SendResult> {
  if (!isEmailConfigured()) return { sent: false, reason: "not-configured" };
  if (!email.to || !email.to.includes("@")) return { sent: false, reason: "no-address" };

  try {
    const response = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [email.to],
        reply_to: EMAIL_REPLY_TO,
        subject: email.subject,
        text: plainText(email),
        html: html(email),
      }),
      // A hung provider must not hold a webhook open until it times out.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[email] provider refused", response.status, detail.slice(0, 300));
      return { sent: false, reason: "failed", detail: `${response.status}` };
    }

    const body = (await response.json()) as { id?: string };
    return { sent: true, id: body.id ?? "" };
  } catch (error) {
    console.error("[email] send failed", error);
    return {
      sent: false,
      reason: "failed",
      detail: error instanceof Error ? error.message : "unknown",
    };
  }
}

/** The text part, with the action appended as a bare URL. */
function plainText(email: Email): string {
  const parts = [email.text];
  if (email.action) parts.push(`${email.action.label}: ${email.action.url}`);
  parts.push(
    "",
    "AfriLynq",
    "Trade between UK buyers and African producers.",
    "You are receiving this because of activity on your AfriLynq account."
  );
  return parts.join("\n\n");
}

/**
 * The HTML part.
 *
 * Deliberately plain: a table, inline styles, no external stylesheet and
 * no images. Email clients are a hostile rendering environment and a
 * notification that arrives looking broken is worse than one that arrives
 * looking dull. The colours match the platform without depending on it.
 */
function html(email: Email): string {
  const button = email.action
    ? `<tr><td style="padding:28px 32px 4px">
         <a href="${escapeHtml(email.action.url)}"
            style="background:#1E5C3A;color:#ffffff;text-decoration:none;
                   padding:13px 26px;border-radius:8px;display:inline-block;
                   font-weight:600;font-size:15px">${escapeHtml(email.action.label)}</a>
       </td></tr>`
    : "";

  const paragraphs = email.text
    .split("\n\n")
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#2B2B28">${escapeHtml(
          p
        ).replace(/\n/g, "<br>")}</p>`
    )
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(email.subject)}</title></head>
<body style="margin:0;padding:0;background:#F6F3ED">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F3ED;padding:32px 16px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="max-width:560px;background:#FFFDF9;border:1px solid #E6DFD2;border-radius:14px">
    <tr><td style="padding:28px 32px 0">
      <p style="margin:0;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;
                color:#1E5C3A;font-weight:700">AfriLynq</p>
    </td></tr>
    <tr><td style="padding:20px 32px 0">
      <h1 style="margin:0 0 18px;font-size:21px;line-height:1.3;color:#1A1A18;font-weight:600">
        ${escapeHtml(email.subject)}</h1>
      ${paragraphs}
    </td></tr>
    ${button}
    <tr><td style="padding:28px 32px 28px">
      <p style="margin:0;border-top:1px solid #E6DFD2;padding-top:18px;
                font-size:12px;line-height:1.6;color:#7A7368">
        You are receiving this because of activity on your AfriLynq account.<br>
        Trade between UK buyers and African producers.
      </p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

/** Nothing reaches an email body unescaped, including names people chose. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Absolute URL for a path, for links in email where relative is useless. */
export function siteUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://www.afrilynq.co.uk");
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
