import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  userCompanies,
  companyCertifications,
  type Certification,
} from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import { DocumentUpload, SubmitVerification } from "@/components/account/Documents";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Documents and verification",
  robots: { index: false, follow: false },
};

const BUCKET = "company-documents";

/** How each document reads once AfriLynq has looked at it. */
const DOC_STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Awaiting review", tone: "bg-gold/15 text-gold-deep" },
  verified: { label: "Accepted", tone: "bg-forest/10 text-forest" },
  rejected: { label: "Not accepted", tone: "bg-[#f6e3e0] text-[#8c3b2c]" },
  expired: { label: "Expired", tone: "bg-sand-deep text-ink-soft" },
};

/** Where the company stands, and whose turn it is. */
const COMPANY_STATE: Record<string, { title: string; note: string }> = {
  unverified: {
    title: "Not yet submitted",
    note: "Add your documents below, then submit. Nothing of yours is public until we have checked them.",
  },
  pending: {
    title: "With AfriLynq for review",
    note: "We have your documents and are checking them. You will hear by email, usually within two working days. There is nothing for you to do.",
  },
  verified: {
    title: "Verified",
    note: "Your company can appear in the directory. If a certificate is close to expiring, upload the replacement here and it stays that way.",
  },
  rejected: {
    title: "Not accepted",
    note: "Have a look at the notes on the documents below, upload what is missing, and submit again.",
  },
  suspended: {
    title: "Suspended",
    note: "This company is not currently listed. Email info@afrilynq.co.uk if you think this is a mistake.",
  },
};

function fmt(date: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function DocumentsPage() {
  const companies = await userCompanies();
  const company = companies[0];
  if (!company) redirect("/account");

  const documents = await companyCertifications(company.id);

  /**
   * The bucket is private, so a stored path is not a link. Each row gets a
   * URL signed for ten minutes, long enough to open or download and short
   * enough that a copied link is not a lasting hole.
   *
   * Signing with the service role is safe here: the rows came back through
   * row level security, so they are already this company's.
   */
  const links = new Map<string, string>();
  const storage = serviceClient().storage.from(BUCKET);
  await Promise.all(
    documents
      .filter((d): d is Certification & { document_path: string } =>
        Boolean(d.document_path)
      )
      .map(async (d) => {
        const { data } = await storage.createSignedUrl(d.document_path, 600);
        if (data?.signedUrl) links.set(d.id, data.signedUrl);
      })
  );

  const state = COMPANY_STATE[company.verification_status] ?? COMPANY_STATE.unverified;
  const canSubmit =
    company.verification_status === "unverified" ||
    company.verification_status === "rejected";

  return (
    <div className="space-y-6">
      {/* ---------- Where this company stands ---------- */}
      <section className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
        <p className="text-[0.7rem] font-semibold tracking-widest text-stone uppercase">
          {company.trading_name || company.legal_name}
        </p>
        <h2 className="mt-2 text-2xl">{state.title}</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{state.note}</p>

        {canSubmit && (
          <div className="mt-6">
            <SubmitVerification companyId={company.id} documents={documents.length} />
          </div>
        )}
      </section>

      {/* ---------- What is on file ---------- */}
      <section className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
        <h2 className="text-xl">Documents on file</h2>

        {documents.length === 0 ? (
          <p className="mt-3 text-ink-soft">
            Nothing uploaded yet.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-sand">
            {documents.map((d) => {
              const status = DOC_STATUS[d.status] ?? DOC_STATUS.pending;
              const issued = fmt(d.issued_on);
              const expires = fmt(d.expires_on);
              const link = links.get(d.id);

              return (
                <li key={d.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{d.name}</p>
                      <p className="mt-1 text-sm text-stone">
                        {[
                          d.issuing_body,
                          d.reference,
                          issued && `issued ${issued}`,
                          expires && `expires ${expires}`,
                        ]
                          .filter(Boolean)
                          .join(" . ") || "No further details"}
                      </p>
                      {d.review_notes && (
                        <p className="mt-2 max-w-xl rounded-lg border-l-2 border-gold bg-sand px-3.5 py-2.5 text-sm text-ink">
                          {d.review_notes}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${status.tone}`}
                      >
                        {status.label}
                      </span>
                      {link && (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link-quiet text-sm text-forest"
                        >
                          View
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------- Add another ---------- */}
      <DocumentUpload companyId={company.id} />
    </div>
  );
}
