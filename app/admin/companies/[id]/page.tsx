import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import { COUNTRIES } from "@/lib/countries";
import AdminShell, { Panel } from "@/components/admin/Shell";
import VerificationDecision from "@/components/admin/VerificationDecision";

export const dynamic = "force-dynamic";

const BUCKET = "company-documents";

const STATUS_LABEL: Record<string, string> = {
  unverified: "Not submitted",
  pending: "Awaiting review",
  verified: "Verified",
  rejected: "Rejected",
  suspended: "Suspended",
};

const STATUS_COLOUR: Record<string, string> = {
  unverified: "text-white/45",
  pending: "text-gold",
  verified: "text-[#4BC98C]",
  rejected: "text-[#E08A84]",
  suspended: "text-[#E08A84]",
};

const DOC_LABEL: Record<string, string> = {
  pending: "Awaiting review",
  verified: "Accepted",
  rejected: "Not accepted",
  expired: "Expired",
};

const TYPE_LABEL: Record<string, string> = {
  supplier: "Supplier",
  buyer: "Buyer",
  both: "Supplier and buyer",
};

const COUNTRY = new Map(COUNTRIES.map((c) => [c.code, c.name]));

function fmt(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Days until a certificate lapses, negative once it has. */
function daysUntil(date: string | null) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-white/6 py-2.5 last:border-0">
      <dt className="w-40 shrink-0 text-white/40">{label}</dt>
      <dd className="min-w-0 text-white/80">{value || <span className="text-white/30">Not set</span>}</dd>
    </div>
  );
}

export default async function AdminCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { id } = await params;
  const svc = serviceClient();

  const { data: companyRow } = await svc
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!companyRow) notFound();

  const company = companyRow as Record<string, string | number | boolean | null>;

  /**
   * Documents, at every status.
   *
   * The verification queue only shows companies sitting at 'pending', so
   * the moment a decision is made its certificates disappear from
   * administration entirely. That is the gap this page exists to close:
   * certificates carry an expiry date, and you cannot act on an expiry
   * you cannot see.
   */
  const { data: docRows } = await svc
    .from("certifications")
    .select(
      "id, name, issuing_body, reference, document_path, issued_on, expires_on, status, review_notes, created_at"
    )
    .eq("company_id", id)
    .order("created_at", { ascending: false });

  type Doc = {
    id: string;
    name: string;
    issuing_body: string | null;
    reference: string | null;
    document_path: string | null;
    issued_on: string | null;
    expires_on: string | null;
    status: string;
    review_notes: string | null;
  };

  const docs = (docRows ?? []) as Doc[];

  const links = new Map<string, string>();
  const storage = svc.storage.from(BUCKET);
  await Promise.all(
    docs
      .filter((d) => d.document_path)
      .map(async (d) => {
        const { data } = await storage.createSignedUrl(d.document_path as string, 900);
        if (data?.signedUrl) links.set(d.id, data.signedUrl);
      })
  );

  // Who is on the account.
  const { data: memberRows } = await svc
    .from("company_members")
    .select("user_id, member_role, status, joined_at")
    .eq("company_id", id);

  const members = (memberRows ?? []) as {
    user_id: string;
    member_role: string;
    status: string;
    joined_at: string | null;
  }[];

  const { data: people } = members.length
    ? await svc
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", members.map((m) => m.user_id))
    : { data: [] };

  const personById = new Map(
    ((people ?? []) as {
      id: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
    }[]).map((p) => [p.id, p])
  );

  // What they have listed.
  const { data: productRows } = await svc
    .from("products")
    .select("id, name, slug, status, is_featured, enquiry_count, view_count")
    .eq("company_id", id)
    .order("created_at", { ascending: false });

  const products = (productRows ?? []) as {
    id: string;
    name: string;
    slug: string;
    status: string;
    is_featured: boolean;
    enquiry_count: number;
    view_count: number;
  }[];

  const status = String(company.verification_status ?? "unverified");
  const name =
    (company.trading_name as string | null) || String(company.legal_name);

  const expiringSoon = docs.filter((d) => {
    const n = daysUntil(d.expires_on);
    return n !== null && n <= 60;
  });

  return (
    <AdminShell
      admin={admin}
      title={name}
      subtitle={`${TYPE_LABEL[String(company.company_type)] ?? company.company_type} . ${STATUS_LABEL[status] ?? status}`}
    >
      <p className="text-sm">
        <Link href="/admin/companies" className="text-white/50 hover:text-gold">
          &larr; All companies
        </Link>
      </p>

      {/* Certificates about to lapse are the one thing on this page that
          needs acting on rather than reading. */}
      {expiringSoon.length > 0 && status === "verified" && (
        <div className="mt-5 rounded-lg border-l-2 border-gold bg-white/[0.04] px-5 py-4">
          <p className="text-sm text-white/85">
            {expiringSoon.length} document
            {expiringSoon.length === 1 ? "" : "s"} expiring within 60 days, or
            already expired. A verified company resting on a lapsed
            certificate is the thing a buyer will hold you to.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* ---------- Documents ---------- */}
        <div className="space-y-6">
          <Panel title={`Documents (${docs.length})`}>
            {docs.length === 0 ? (
              <p className="py-8 text-center text-white/45">
                Nothing uploaded.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {docs.map((d) => {
                  const link = links.get(d.id);
                  const left = daysUntil(d.expires_on);
                  const detail = [
                    d.issuing_body,
                    d.reference,
                    fmt(d.issued_on) && `issued ${fmt(d.issued_on)}`,
                  ]
                    .filter(Boolean)
                    .join(" . ");

                  return (
                    <li
                      key={d.id}
                      className="rounded-lg bg-white/[0.03] px-4 py-3"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <span className="min-w-0">
                          <span className="text-white/85">{d.name}</span>
                          {detail && (
                            <span className="block text-xs text-white/35">
                              {detail}
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-3 text-sm">
                          <span className="text-white/45">
                            {DOC_LABEL[d.status] ?? d.status}
                          </span>
                          {link ? (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gold hover:underline"
                            >
                              Open
                            </a>
                          ) : (
                            <span className="text-xs text-white/30">No file</span>
                          )}
                        </span>
                      </div>

                      {d.expires_on && (
                        <p
                          className={
                            "mt-1.5 text-xs " +
                            (left !== null && left <= 0
                              ? "text-[#E08A84]"
                              : left !== null && left <= 60
                                ? "text-gold"
                                : "text-white/35")
                          }
                        >
                          {left !== null && left <= 0
                            ? `Expired ${fmt(d.expires_on)}`
                            : `Expires ${fmt(d.expires_on)}${left !== null && left <= 60 ? `, in ${left} days` : ""}`}
                        </p>
                      )}

                      {d.review_notes && (
                        <p className="mt-2 border-l-2 border-gold pl-3 text-xs text-white/60">
                          {d.review_notes}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Available at every status, not only while pending. A
                verified company can be suspended, a rejected one can be
                approved once it fixes what was wrong. */}
            <VerificationDecision
              companyId={id}
              documents={docs.length}
              current={status}
            />
          </Panel>

          <Panel title={`Listings (${products.length})`}>
            {products.length === 0 ? (
              <p className="py-8 text-center text-white/45">
                No listings yet.
              </p>
            ) : (
              <ul className="divide-y divide-white/6">
                {products.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="min-w-0">
                      <span className="text-white/80">{p.name}</span>
                      {p.is_featured && (
                        <span className="ml-2 rounded bg-gold/15 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-gold uppercase">
                          Featured
                        </span>
                      )}
                      <span className="block text-xs text-white/35">
                        {p.view_count} views . {p.enquiry_count} enquiries
                      </span>
                    </span>
                    <span className="shrink-0 text-sm text-white/45">
                      {p.status === "active"
                        ? "Published"
                        : p.status === "draft"
                          ? "Draft"
                          : "Archived"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-sm">
              <Link href="/admin/products" className="text-white/50 hover:text-gold">
                Manage all listings &rarr;
              </Link>
            </p>
          </Panel>
        </div>

        {/* ---------- The company itself ---------- */}
        <div className="space-y-6">
          <Panel title="Company">
            <dl className="text-sm">
              <Row label="Status" value={
                <span className={STATUS_COLOUR[status] ?? "text-white/80"}>
                  {STATUS_LABEL[status] ?? status}
                  {company.is_listed ? ", in the directory" : ""}
                </span>
              } />
              <Row label="Registered name" value={String(company.legal_name)} />
              <Row label="Trading name" value={company.trading_name as string | null} />
              <Row label="Registration no" value={company.registration_number as string | null} />
              <Row label="Tax no" value={company.tax_number as string | null} />
              <Row
                label="Country"
                value={
                  company.country_code
                    ? (COUNTRY.get(String(company.country_code).trim()) ??
                      String(company.country_code))
                    : null
                }
              />
              <Row
                label="Address"
                value={[
                  company.address_line1,
                  company.address_line2,
                  company.city,
                  company.state_or_region,
                  company.postcode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              />
              <Row label="Contact email" value={company.contact_email as string | null} />
              <Row label="Contact phone" value={company.contact_phone as string | null} />
              <Row label="Website" value={company.website_url as string | null} />
              <Row label="Established" value={company.year_established as number | null} />
              <Row label="Created" value={fmt(String(company.created_at))} />
              <Row label="Decided" value={fmt(company.verified_at as string | null)} />
            </dl>

            {company.verification_notes && (
              <p className="mt-4 border-l-2 border-gold pl-3 text-sm text-white/65">
                {String(company.verification_notes)}
              </p>
            )}

            {company.slug && status === "verified" && company.is_listed && (
              <p className="mt-4 text-sm">
                <Link
                  href={`/suppliers/${company.slug}`}
                  target="_blank"
                  className="text-white/50 hover:text-gold"
                >
                  View public profile &rarr;
                </Link>
              </p>
            )}
          </Panel>

          <Panel title={`People (${members.length})`}>
            {members.length === 0 ? (
              <p className="py-6 text-center text-white/45">
                Nobody on this company.
              </p>
            ) : (
              <ul className="divide-y divide-white/6">
                {members.map((m) => {
                  const person = personById.get(m.user_id);
                  return (
                    <li key={m.user_id} className="py-3 first:pt-0 last:pb-0">
                      <p className="text-white/80">
                        {person?.full_name ?? "Unknown"}
                        <span className="ml-2 text-xs text-white/40 capitalize">
                          {m.member_role}
                          {m.status !== "active" ? `, ${m.status}` : ""}
                        </span>
                      </p>
                      {person?.email && (
                        <a
                          href={`mailto:${person.email}`}
                          className="text-xs text-white/50 hover:text-gold"
                        >
                          {person.email}
                        </a>
                      )}
                      {person?.phone && (
                        <span className="block text-xs text-white/40">
                          {person.phone}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {company.about && (
            <Panel title="About">
              <p className="text-sm leading-relaxed whitespace-pre-line text-white/70">
                {String(company.about)}
              </p>
            </Panel>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
