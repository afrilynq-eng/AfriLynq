import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import { COUNTRIES } from "@/lib/countries";
import AdminShell, { Panel } from "@/components/admin/Shell";
import VerificationDecision from "@/components/admin/VerificationDecision";

export const dynamic = "force-dynamic";

const BUCKET = "company-documents";

const TYPE_LABEL: Record<string, string> = {
  supplier: "Supplier",
  buyer: "Buyer",
  both: "Supplier and buyer",
};

const COUNTRY = new Map(COUNTRIES.map((c) => [c.code, c.name]));

interface Row {
  id: string;
  legal_name: string;
  trading_name: string | null;
  company_type: string;
  country_code: string | null;
  city: string | null;
  registration_number: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  short_description: string | null;
  verification_status: string;
  verification_notes: string | null;
  verified_at: string | null;
  created_at: string;
}

interface Doc {
  id: string;
  company_id: string;
  name: string;
  issuing_body: string | null;
  reference: string | null;
  document_path: string | null;
  issued_on: string | null;
  expires_on: string | null;
}

function fmt(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function age(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export default async function VerificationPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  /**
   * Read with the service role.
   *
   * Authorisation already happened: requireAdmin read platform_role out of
   * the database a line above, rather than trusting anything in the token.
   * What follows is a read across every company in the system, which is the
   * job of this page. Decisions are written back as the administrator, not
   * as the service role, so the database still sees who decided what.
   */
  const svc = serviceClient();

  const COLUMNS =
    "id, legal_name, trading_name, company_type, country_code, city, registration_number, contact_email, contact_phone, short_description, verification_status, verification_notes, verified_at, created_at";

  const [{ data: pendingRaw }, { data: decidedRaw }] = await Promise.all([
    svc
      .from("companies")
      .select(COLUMNS)
      .eq("verification_status", "pending")
      .order("created_at", { ascending: true }),
    svc
      .from("companies")
      .select(COLUMNS)
      .not("verified_at", "is", null)
      .order("verified_at", { ascending: false })
      .limit(10),
  ]);

  const pending = (pendingRaw ?? []) as Row[];
  const decided = (decidedRaw ?? []) as Row[];
  const ids = pending.map((c) => c.id);

  // Who owns each one, so you know whose documents you are looking at.
  const owners = new Map<string, { name: string | null; email: string | null }>();
  if (ids.length) {
    const { data: members } = await svc
      .from("company_members")
      .select("company_id, user_id")
      .in("company_id", ids)
      .eq("member_role", "owner");

    const rows = (members ?? []) as { company_id: string; user_id: string }[];
    if (rows.length) {
      const { data: people } = await svc
        .from("profiles")
        .select("id, full_name, email")
        .in("id", rows.map((r) => r.user_id));

      const byId = new Map(
        ((people ?? []) as { id: string; full_name: string | null; email: string | null }[]).map(
          (p) => [p.id, p]
        )
      );
      for (const r of rows) {
        const p = byId.get(r.user_id);
        owners.set(r.company_id, { name: p?.full_name ?? null, email: p?.email ?? null });
      }
    }
  }

  // The documents, and a short lived link to each one. The bucket is
  // private, so a stored path on its own opens nothing.
  const docs = new Map<string, Doc[]>();
  const links = new Map<string, string>();
  if (ids.length) {
    const { data } = await svc
      .from("certifications")
      .select(
        "id, company_id, name, issuing_body, reference, document_path, issued_on, expires_on"
      )
      .in("company_id", ids)
      .order("created_at", { ascending: true });

    const storage = svc.storage.from(BUCKET);
    await Promise.all(
      ((data ?? []) as Doc[]).map(async (d) => {
        const list = docs.get(d.company_id) ?? [];
        list.push(d);
        docs.set(d.company_id, list);

        if (d.document_path) {
          const { data: signed } = await storage.createSignedUrl(d.document_path, 900);
          if (signed?.signedUrl) links.set(d.id, signed.signedUrl);
        }
      })
    );
  }

  return (
    <AdminShell
      admin={admin}
      title="Verification"
      subtitle="Companies that have submitted their documents and are waiting on a decision"
    >
      <Panel title={`Waiting on you (${pending.length})`}>
        {pending.length === 0 ? (
          <p className="py-12 text-center text-white/45">
            Nothing waiting. Submitted companies appear here.
          </p>
        ) : (
          <div className="space-y-5">
            {pending.map((c) => {
              const owner = owners.get(c.id);
              const list = docs.get(c.id) ?? [];

              return (
                <article
                  key={c.id}
                  className="rounded-lg bg-white/[0.03] p-5 ring-1 ring-white/8"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg !text-white">
                        {c.trading_name || c.legal_name}
                      </h3>
                      {c.trading_name && (
                        <p className="text-sm text-white/40">
                          Registered as {c.legal_name}
                        </p>
                      )}
                      <p className="mt-1.5 text-sm text-white/55">
                        {[
                          TYPE_LABEL[c.company_type] ?? c.company_type,
                          c.city,
                          c.country_code ? (COUNTRY.get(c.country_code) ?? c.country_code) : null,
                        ]
                          .filter(Boolean)
                          .join(" . ")}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-sm text-white/35">
                      created {age(c.created_at)}
                    </span>
                  </div>

                  {c.short_description && (
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
                      {c.short_description}
                    </p>
                  )}

                  <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-white/35">Owner</dt>
                      <dd className="min-w-0 truncate text-white/70">
                        {owner?.name ?? "Unknown"}
                        {owner?.email && (
                          <span className="text-white/40"> . {owner.email}</span>
                        )}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-white/35">Registration</dt>
                      <dd className="min-w-0 truncate text-white/70">
                        {c.registration_number ?? "Not supplied"}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-white/35">Contact</dt>
                      <dd className="min-w-0 truncate text-white/70">
                        {[c.contact_email, c.contact_phone].filter(Boolean).join(" . ") ||
                          "Not supplied"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4">
                    <p className="text-[0.7rem] font-semibold tracking-widest text-white/40 uppercase">
                      Documents ({list.length})
                    </p>
                    {list.length === 0 ? (
                      <p className="mt-2 text-sm text-white/40">
                        None uploaded. Reject with a note asking for them.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {list.map((d) => {
                          const link = links.get(d.id);
                          const detail = [
                            d.issuing_body,
                            d.reference,
                            fmt(d.issued_on) && `issued ${fmt(d.issued_on)}`,
                            fmt(d.expires_on) && `expires ${fmt(d.expires_on)}`,
                          ]
                            .filter(Boolean)
                            .join(" . ");

                          return (
                            <li
                              key={d.id}
                              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded bg-white/[0.03] px-3.5 py-2.5"
                            >
                              <span className="min-w-0 text-sm text-white/80">
                                {d.name}
                                {detail && (
                                  <span className="block text-xs text-white/35">
                                    {detail}
                                  </span>
                                )}
                              </span>
                              {link ? (
                                <a
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 text-sm text-gold hover:underline"
                                >
                                  Open
                                </a>
                              ) : (
                                <span className="shrink-0 text-xs text-white/30">
                                  No file
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <VerificationDecision companyId={c.id} documents={list.length} />
                </article>
              );
            })}
          </div>
        )}
      </Panel>

      <div className="mt-6">
        <Panel title="Recently decided">
          {decided.length === 0 ? (
            <p className="py-8 text-center text-white/45">
              Nothing decided yet.
            </p>
          ) : (
            <ul className="divide-y divide-white/6">
              {decided.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0"
                >
                  <span className="min-w-0">
                    <span className="text-white/80">
                      {c.trading_name || c.legal_name}
                    </span>
                    {c.verification_notes && (
                      <span className="block max-w-xl text-xs text-white/35">
                        {c.verification_notes}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm">
                    <span
                      className={
                        c.verification_status === "verified"
                          ? "text-[#4BC98C]"
                          : "text-[#E08A84]"
                      }
                    >
                      {c.verification_status === "verified" ? "Approved" : "Rejected"}
                    </span>
                    <span className="tabular text-white/30">
                      {" . "}
                      {fmt(c.verified_at)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}
