import type { Metadata } from "next";
import Link from "next/link";
import {
  userCompanies,
  certificationCounts,
  type MemberCompany,
} from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

/**
 * How a company's verification state reads to the person who owns it, and
 * what they should do about it. Every state names an action or says plainly
 * that the ball is with us, so none of them is a dead end.
 */
const VERIFICATION: Record<
  string,
  { label: string; tone: "waiting" | "good" | "stopped"; note: string }
> = {
  unverified: {
    label: "Not yet submitted",
    tone: "waiting",
    note: "Add your certificates and registration documents, then submit for verification. Nothing of yours is public until it is verified.",
  },
  pending: {
    label: "With AfriLynq for review",
    tone: "waiting",
    note: "We are checking your documents. You will hear by email, usually within two working days. There is nothing for you to do.",
  },
  verified: {
    label: "Verified",
    tone: "good",
    note: "Your company can appear in the directory and buyers can find you. Keep your certificates up to date so this does not lapse.",
  },
  rejected: {
    label: "Not accepted",
    tone: "stopped",
    note: "We could not verify the company on the documents supplied. The reason is on your documents page, and you can upload replacements and submit again.",
  },
  suspended: {
    label: "Suspended",
    tone: "stopped",
    note: "This company is not currently listed. Email info@afrilynq.co.uk if you think this is a mistake.",
  },
};

const TYPE_LABEL: Record<string, string> = {
  supplier: "Supplier",
  buyer: "Buyer",
  both: "Supplier and buyer",
};

function StatusPill({ status }: { status: string }) {
  const state = VERIFICATION[status] ?? VERIFICATION.unverified;
  const tone =
    state.tone === "good"
      ? "bg-forest/10 text-forest"
      : state.tone === "stopped"
        ? // No red in the palette, and a rejection should not read as a
        // warning badge. A muted terracotta sits beside the sand without
        // shouting, and the note underneath carries the detail.
        "bg-[#f6e3e0] text-[#8c3b2c]"
        : "bg-gold/15 text-gold-deep";

  return (
    <span className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${tone}`}>
      {state.label}
    </span>
  );
}

function CompanyCard({
  company,
  documents,
}: {
  company: MemberCompany;
  documents: number;
}) {
  const state = VERIFICATION[company.verification_status] ?? VERIFICATION.unverified;
  const canSubmit =
    company.verification_status === "unverified" ||
    company.verification_status === "rejected";

  return (
    <article className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl">{company.trading_name || company.legal_name}</h3>
          <p className="mt-1 text-sm text-stone">
            {TYPE_LABEL[company.company_type] ?? company.company_type}
            {" . "}
            You are the {company.member_role}
          </p>
        </div>
        <StatusPill status={company.verification_status} />
      </div>

      <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">{state.note}</p>

      <p className="mt-4 text-sm text-stone">
        {documents === 0
          ? "No documents uploaded yet"
          : documents === 1
            ? "1 document on file"
            : `${documents} documents on file`}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/account/documents"
          className="btn-lift rounded-lg bg-forest px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-gold hover:text-forest-deep"
        >
          {canSubmit && documents === 0
            ? "Add documents"
            : "Documents and verification"}
        </Link>
      </div>
    </article>
  );
}

export default async function AccountPage() {
  const companies = await userCompanies();
  const counts = await certificationCounts(companies.map((c) => c.id));

  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-sand-deep bg-paper p-8 shadow-sm">
        <h2 className="text-2xl">Set up your company</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Everything on AfriLynq happens through a company rather than a
          personal account. Create yours and you can add listings, upload
          certificates and send or answer enquiries.
        </p>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
          It takes two minutes, and you can change any of it later.
        </p>
        <Link
          href="/account/company/new"
          className="btn-lift btn-primary mt-7 inline-block"
        >
          Create my company
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-2xl">
          {companies.length === 1 ? "Your company" : "Your companies"}
        </h2>
        <Link href="/account/company/new" className="link-quiet text-sm text-ink-soft">
          Add another &rarr;
        </Link>
      </div>

      <div className="mt-6 space-y-5">
        {companies.map((c) => (
          <CompanyCard key={c.id} company={c} documents={counts[c.id] ?? 0} />
        ))}
      </div>
    </>
  );
}
