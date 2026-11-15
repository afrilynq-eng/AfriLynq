import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser, userCompanies, sessionClient } from "@/lib/supabase-server";
import MessageComposer from "@/components/account/MessageComposer";
import { sendMessage } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conversation",
  robots: { index: false, follow: false },
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const companies = await userCompanies();
  const mine = new Set(companies.map((c) => c.id));
  const supabase = await sessionClient();

  const { data: threadRow } = await supabase
    .from("message_threads")
    .select(
      "id, subject, enquiry_id, buyer_company_id, buyer_profile_id, supplier_company_id, is_closed"
    )
    .eq("id", id)
    .maybeSingle();

  const thread = threadRow as unknown as {
    id: string;
    subject: string | null;
    enquiry_id: string | null;
    buyer_company_id: string | null;
    buyer_profile_id: string | null;
    supplier_company_id: string;
    is_closed: boolean;
  } | null;

  if (!thread) notFound();

  const [{ data: msgs }, { data: parties }, { data: quotes }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, body, sender_company_id, sender_id, created_at")
      .eq("thread_id", thread.id)
      .order("created_at"),
    supabase
      .from("companies")
      .select("id, legal_name, trading_name")
      .in(
        "id",
        [thread.buyer_company_id, thread.supplier_company_id].filter(
          (v): v is string => Boolean(v)
        )
      ),
    thread.enquiry_id
      ? supabase
          .from("quotations")
          .select("id, reference, status")
          .eq("enquiry_id", thread.enquiry_id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const names = new Map(
    ((parties ?? []) as {
      id: string;
      legal_name: string;
      trading_name: string | null;
    }[]).map((c) => [c.id, c.trading_name || c.legal_name])
  );

  /**
   * The buyer may be a person rather than a company, so their name comes
   * from profiles. A shopper viewing this is not a member of either
   * company, which is why the supplier branch is the fallback.
   */
  if (mine.has(thread.supplier_company_id) && thread.buyer_profile_id) {
    const { data: person } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", thread.buyer_profile_id)
      .maybeSingle();
    const p = person as { id: string; full_name: string | null } | null;
    if (p) names.set(p.id, p.full_name || "A shopper");
  }

  const otherId = mine.has(thread.supplier_company_id)
    ? thread.buyer_company_id ?? thread.buyer_profile_id
    : thread.supplier_company_id;

  const messages = (msgs ?? []) as unknown as {
    id: string;
    body: string;
    sender_company_id: string | null;
    sender_id: string;
    created_at: string;
  }[];

  const relatedQuotes = (quotes ?? []) as unknown as {
    id: string;
    reference: string;
    status: string;
  }[];

  const send = sendMessage.bind(null, thread.id);

  return (
    <>
      <div className="mb-6">
        <Link href="/account/messages" className="link-quiet text-sm text-ink-soft">
          &larr; All messages
        </Link>
        <h1 className="mt-2 text-3xl sm:text-4xl">
          {(otherId && names.get(otherId)) ?? "Conversation"}
        </h1>
        <p className="mt-2 text-ink-soft">{thread.subject ?? "Enquiry"}</p>
      </div>

      {/* The quotation sits beside the conversation rather than somewhere
          else, because "what did they actually quote" is the question
          being discussed. */}
      {relatedQuotes.length > 0 && (
        <section className="mb-6 rounded-lg border border-sand-deep bg-sand/40 px-5 py-4">
          <p className="text-xs font-semibold tracking-wide text-stone uppercase">
            Quotations on this enquiry
          </p>
          <p className="mt-2 text-ink">
            {relatedQuotes.map((q, i) => (
              <span key={q.id}>
                {i > 0 && " · "}
                <Link href={`/account/quotations/${q.id}`} className="link-quiet text-forest">
                  {q.reference}
                </Link>{" "}
                <span className="text-stone">({q.status})</span>
              </span>
            ))}
          </p>
        </section>
      )}

      <section className="mb-6 space-y-3">
        {messages.length === 0 ? (
          <p className="rounded-xl border border-sand-deep bg-paper px-5 py-8 text-center text-ink-soft shadow-sm">
            No messages yet. Write the first one below.
          </p>
        ) : (
          messages.map((m) => {
            // A shopper's message carries no company, so it is theirs
            // when the sender is them.
            const isMine = m.sender_company_id
              ? mine.has(m.sender_company_id)
              : m.sender_id === user.id;
            return (
              <article
                key={m.id}
                className={
                  "max-w-[85%] rounded-xl px-5 py-4 shadow-sm " +
                  (isMine
                    ? "ml-auto border border-forest/20 bg-forest/5"
                    : "border border-sand-deep bg-paper")
                }
              >
                <p className="text-xs text-stone">
                  {(m.sender_company_id ? names.get(m.sender_company_id) : names.get(m.sender_id)) ??
                    (m.sender_id === user.id ? "You" : "A shopper")}{" "}
                  · {when(m.created_at)}
                </p>
                <p className="mt-1.5 leading-relaxed whitespace-pre-wrap text-ink">
                  {m.body}
                </p>
              </article>
            );
          })
        )}
      </section>

      <MessageComposer send={send} disabled={thread.is_closed} />

      {thread.enquiry_id && (
        <p className="mt-5 text-sm text-stone">
          <Link
            href={`/account/enquiries/${thread.enquiry_id}/quote`}
            className="link-quiet text-forest"
          >
            Send a quotation
          </Link>{" "}
          against this enquiry, if you are the supplier.
        </p>
      )}
    </>
  );
}
