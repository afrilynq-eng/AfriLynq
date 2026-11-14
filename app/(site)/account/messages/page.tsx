import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, userCompanies, sessionClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false, follow: false },
};

/**
 * Conversations, newest activity first.
 *
 * One thread per enquiry, so this reads as a list of the things being
 * discussed rather than a list of people. RLS limits it to threads the
 * viewer's company is party to.
 */

function ago(iso: string | null) {
  if (!iso) return "no messages yet";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const companies = await userCompanies();
  const mine = new Set(companies.map((c) => c.id));
  const supabase = await sessionClient();

  const { data } = await supabase
    .from("message_threads")
    .select(
      "id, subject, enquiry_id, buyer_company_id, supplier_company_id, " +
        "last_message_at, is_closed, created_at"
    )
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(200);

  const threads = (data ?? []) as unknown as {
    id: string;
    subject: string | null;
    buyer_company_id: string;
    supplier_company_id: string;
    last_message_at: string | null;
    is_closed: boolean;
    created_at: string;
  }[];

  const otherIds = Array.from(
    new Set(
      threads.map((t) =>
        mine.has(t.supplier_company_id) ? t.buyer_company_id : t.supplier_company_id
      )
    )
  );

  const names = new Map<string, string>();
  if (otherIds.length > 0) {
    const { data: cos } = await supabase
      .from("companies")
      .select("id, legal_name, trading_name")
      .in("id", otherIds);
    for (const c of (cos ?? []) as {
      id: string;
      legal_name: string;
      trading_name: string | null;
    }[]) {
      names.set(c.id, c.trading_name || c.legal_name);
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl">Messages</h1>
        <p className="mt-2 text-ink-soft">
          {threads.length === 0
            ? "Nothing yet."
            : "One conversation for each enquiry being discussed."}
        </p>
      </div>

      {error === "notfound" && (
        <p className="mb-6 rounded-lg border-l-2 border-gold bg-sand px-5 py-4 text-ink">
          That enquiry is not available to you.
        </p>
      )}

      {threads.length === 0 ? (
        <div className="rounded-xl border border-sand-deep bg-paper p-10 text-center shadow-sm">
          <h2 className="text-2xl">No conversations yet</h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-ink-soft">
            A conversation starts from an enquiry. Open one and press Message,
            and everything said about that request stays in one place, with
            the quotation beside it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/account/enquiries" className="btn-lift btn-primary">
              My enquiries
            </Link>
            <Link href="/account/quotations" className="btn-lift btn-ghost">
              Quotations
            </Link>
          </div>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-sand-deep bg-paper shadow-sm">
          {threads.map((t) => {
            const otherId = mine.has(t.supplier_company_id)
              ? t.buyer_company_id
              : t.supplier_company_id;
            return (
              <li key={t.id} className="border-b border-sand last:border-0">
                <Link
                  href={`/account/messages/${t.id}`}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-sand/40"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-ink">
                      {names.get(otherId) ?? "A company"}
                    </span>
                    <span className="block text-sm text-ink-soft">
                      {t.subject ?? "Enquiry"}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-stone">
                    {t.is_closed ? "Closed" : ago(t.last_message_at)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
