import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser, sessionClient } from "@/lib/supabase-server";
import QuotationForm from "@/components/account/QuotationForm";
import { sendQuotation } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Send a quotation",
  robots: { index: false, follow: false },
};

/**
 * The supplier's reply to an enquiry, priced.
 *
 * Until now a supplier could read an enquiry and decline it, and that
 * was all. Answering it meant leaving the platform, which is the point
 * at which a marketplace stops being a marketplace.
 *
 * The enquiry is read through RLS rather than with the service role, so
 * a supplier who is not party to it gets nothing back and lands on the
 * not-found page. That is the permission check; there is no second one
 * to forget.
 */

interface EnquiryForQuote {
  id: string;
  reference: string;
  status: string;
  quantity: number;
  unit_code: string;
  product_name_snapshot: string | null;
  required_by: string | null;
  incoterm: string | null;
  target_currency: string | null;
  message: string | null;
  delivery_city: string | null;
  delivery_country_code: string | null;
  buyer_company_id: string;
  supplier_company_id: string;
  created_at: string;
}

export default async function QuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const supabase = await sessionClient();

  const [{ data: enquiryRow }, { data: units }, { data: currencies }] =
    await Promise.all([
      supabase
        .from("enquiries")
        .select(
          "id, reference, status, quantity, unit_code, product_name_snapshot, " +
            "required_by, incoterm, target_currency, message, delivery_city, " +
            "delivery_country_code, buyer_company_id, supplier_company_id, created_at"
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("units")
        .select("code, name")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("currencies")
        .select("code, name, minor_units")
        .eq("is_active", true)
        .order("code"),
    ]);

  // The row comes back loosely typed from a long select, so it is named
  // once here rather than cast at every use below.
  const enquiry = enquiryRow as EnquiryForQuote | null;
  if (!enquiry) notFound();

  const { data: buyer } = await supabase
    .from("companies")
    .select("legal_name, trading_name, country_code")
    .eq("id", enquiry.buyer_company_id)
    .maybeSingle();

  const already = await supabase
    .from("quotations")
    .select("id, reference, status, created_at")
    .eq("enquiry_id", enquiry.id)
    .order("created_at", { ascending: false });

  const sent = (already.data ?? []) as {
    id: string;
    reference: string;
    status: string;
  }[];

  const currencyList = (currencies ?? []) as {
    code: string;
    name: string;
    minor_units: number;
  }[];

  const minorUnits: Record<string, number> = {};
  for (const c of currencyList) minorUnits[c.code] = c.minor_units;

  const action = sendQuotation.bind(null, enquiry.id);

  return (
    <>
      <div className="mb-6">
        <Link href="/account/enquiries" className="link-quiet text-sm text-ink-soft">
          &larr; Back to enquiries
        </Link>
        <h1 className="mt-2 text-3xl sm:text-4xl">Send a quotation</h1>
        <p className="mt-2 text-ink-soft">
          To {buyer?.trading_name || buyer?.legal_name || "the buyer"}, against
          enquiry {enquiry.reference}.
        </p>
      </div>

      {/* What was actually asked for, kept in front of the supplier while
          they price it. The snapshot is the wording at the time of the
          enquiry, not whatever the listing says today. */}
      <section className="mb-6 rounded-xl border border-sand-deep bg-sand/40 p-6">
        <h2 className="text-base font-semibold text-ink">What they asked for</h2>
        <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs tracking-wide text-stone uppercase">Produce</dt>
            <dd className="mt-0.5 text-ink">
              {enquiry.product_name_snapshot ?? "Not specified"}
            </dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-stone uppercase">Quantity</dt>
            <dd className="tabular mt-0.5 text-ink">
              {enquiry.quantity} {enquiry.unit_code}
            </dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-stone uppercase">Needed by</dt>
            <dd className="mt-0.5 text-ink">
              {enquiry.required_by
                ? new Date(enquiry.required_by).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Not stated"}
            </dd>
          </div>
          {(enquiry.delivery_city || enquiry.delivery_country_code) && (
            <div>
              <dt className="text-xs tracking-wide text-stone uppercase">Delivery to</dt>
              <dd className="mt-0.5 text-ink">
                {[enquiry.delivery_city, enquiry.delivery_country_code]
                  .filter(Boolean)
                  .join(", ")}
              </dd>
            </div>
          )}
          {enquiry.incoterm && (
            <div>
              <dt className="text-xs tracking-wide text-stone uppercase">Incoterm asked</dt>
              <dd className="mt-0.5 text-ink">{enquiry.incoterm}</dd>
            </div>
          )}
        </dl>
        {enquiry.message && (
          <p className="mt-4 border-t border-sand-deep pt-4 leading-relaxed text-ink-soft">
            {enquiry.message}
          </p>
        )}
      </section>

      {sent.length > 0 && (
        <section className="mb-6 rounded-lg border-l-2 border-gold bg-sand px-5 py-4">
          <p className="text-ink">
            You have already quoted this enquiry{" "}
            {sent.length === 1 ? "once" : `${sent.length} times`}:{" "}
            {sent.map((q, i) => (
              <span key={q.id}>
                {i > 0 && ", "}
                <Link href={`/account/quotations/${q.id}`} className="link-quiet text-forest">
                  {q.reference}
                </Link>{" "}
                <span className="text-stone">({q.status})</span>
              </span>
            ))}
            . Sending another creates a fresh quotation rather than changing
            those, so the buyer can compare them.
          </p>
        </section>
      )}

      <QuotationForm
        action={action}
        units={(units ?? []) as { code: string; name: string }[]}
        currencies={currencyList}
        minorUnitsByCurrency={minorUnits}
        enquiryRef={enquiry.reference}
        prefill={{
          description: enquiry.product_name_snapshot ?? "",
          quantity: String(enquiry.quantity ?? ""),
          unit: enquiry.unit_code ?? "",
          currency: enquiry.target_currency ?? "GBP",
          incoterm: enquiry.incoterm,
        }}
      />
    </>
  );
}
