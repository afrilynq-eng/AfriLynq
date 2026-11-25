import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, sessionClient } from "@/lib/supabase-server";
import { isEmailConfigured } from "@/lib/email";
import { markAllRead } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

/**
 * Everything the platform has told this person.
 *
 * The notifications table has existed since September and nothing has
 * ever read it, so until now the platform recorded that it had told
 * somebody something without ever showing it to them. This is the other
 * half.
 *
 * It reads through the user's own session. The policy written in
 * September already limits rows to user_id = auth.uid(), so that policy
 * is what decides rather than a filter written here that could drift
 * from it.
 */

const ICON: Record<string, string> = {
  payment_received: "✓",
  order_paid: "✓",
  order_shipped: "→",
  order_delivered: "→",
  delivery_confirmed: "✓",
  payout_approved: "✓",
  payout_paid: "✓",
  dispute_raised: "!",
  dispute_resolved: "✓",
};

const TONE: Record<string, string> = {
  dispute_raised: "bg-gold/15 text-gold-deep",
  dispute_resolved: "bg-forest/10 text-forest",
};

export default async function NotificationsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const supabase = await sessionClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link_path, read_at, emailed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const notifications = (data ?? []) as unknown as {
    id: string;
    kind: string;
    title: string;
    body: string | null;
    link_path: string | null;
    read_at: string | null;
    emailed_at: string | null;
    created_at: string;
  }[];

  const unread = notifications.filter((n) => !n.read_at).length;

  const when = (iso: string) => {
    const then = new Date(iso);
    const mins = Math.round((Date.now() - then.getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    return then.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl">Notifications</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
              {unread > 0
                ? `${unread} unread.`
                : "Everything that has happened on your account."}
            </p>
          </div>
          {unread > 0 && (
            <form action={markAllRead}>
              <button
                type="submit"
                className="rounded-lg border border-sand-deep px-4 py-2 text-sm font-medium text-ink hover:bg-sand"
              >
                Mark all read
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Said once, here, rather than left for somebody to discover: with
          no provider configured these are recorded but never posted. */}
      {!isEmailConfigured() && notifications.length > 0 && (
        <p className="rounded-lg border-l-2 border-gold bg-gold/5 px-5 py-4 text-sm text-ink-soft">
          Email is not switched on yet, so these appear here but are not sent to your
          inbox. Check this page for anything that needs your attention.
        </p>
      )}

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-sand-deep bg-paper p-10 text-center shadow-sm">
          <h2 className="text-lg">Nothing yet</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
            When a quotation arrives, an order is paid for or a payment reaches you, it
            appears here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => {
            const row = (
              <>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    TONE[n.kind] ?? "bg-sand text-stone"
                  }`}
                  aria-hidden="true"
                >
                  {ICON[n.kind] ?? "•"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{n.title}</span>
                  {n.body && (
                    <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
                      {n.body.split("\n\n")[0]}
                    </span>
                  )}
                  <span className="mt-1.5 block text-xs text-stone">
                    {when(n.created_at)}
                    {n.emailed_at ? " · emailed" : ""}
                  </span>
                </span>
              </>
            );

            const classes =
              "flex items-start gap-4 rounded-xl border px-5 py-4 shadow-sm " +
              (n.read_at
                ? "border-sand-deep bg-paper"
                : "border-forest/25 bg-forest/[0.04]");

            return (
              <li key={n.id}>
                {n.link_path ? (
                  <Link href={n.link_path} className={`${classes} hover:bg-sand/40`}>
                    {row}
                  </Link>
                ) : (
                  <div className={classes}>{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
