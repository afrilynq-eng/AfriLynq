import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser, userCompanies, sessionClient } from "@/lib/supabase-server";
import { formatMinor, formatQuantity, QUOTATION_STATUS } from "@/lib/money";
import QuotationDecision from "@/components/account/QuotationDecision";
import { respondToQuotation } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quotation",
  robots: { index: false, follow: false },
};

const date = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

interface QuotationRow {
  id: string;
  reference: string;
  status: string;
  currency: string;
  subtotal_minor: number;
  shipping_minor: number;
  other_charges_minor: number;
  total_minor: number;
  incoterm: string | null;
  lead_time_days: number | null;
  payment_terms: string | null;
  packaging_notes: string | null;
  notes: string | null;
  valid_until: string | null;
  sent_at: string | null;
  responded_at: string | null;
  decline_reason: string | null;
  created_at: string;
  enquiry_id: string;
  supplier_company_id: string;
  buyer_company_id: string | null;
  buyer_profile_id: string | null;
}

export default async function QuotationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const { id } = await params;
  const { sent } = await searchParams;

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const companies = await userCompanies();
  const mine = new Set(companies.map((c) => c.id));
  const supabase = await sessionClient();

  const { data: quotationRow } = await supabase
    .from("quotations")
    .select(
      "id, reference, status, currency, subtotal_minor, shipping_minor, " +
        "other_charges_minor, total_minor, incoterm, lead_time_days, " +
        "payment_terms, packaging_notes, notes, valid_until, sent_at, " +
        "responded_at, decline_reason, created_at, enquiry_id, " +
        "supplier_company_id, buyer_company_id, buyer_profile_id"
    )
    .eq("id", id)
    .maybeSingle();

  // Named once rather than cast at every use: the select is long enough
  // that the client cannot infer its shape.
  const q = quotationRow as QuotationRow | null;
  if (!q) notFound();

  const [{ data: lines }, { data: cur }, { data: parties }, { data: enquiry }] =
    await Promise.all([
      supabase
        .from("quotation_lines")
        .select("id, description, quantity, unit_code, unit_price_minor, line_total_minor")
        .eq("quotation_id", q.id)
        .order("sort_order"),
      supabase
        .from("currencies")
        .select("minor_units")
        .eq("code", q.currency)
        .maybeSingle(),
      supabase
        .from("companies")
        .select("id, legal_name, trading_name, country_code")
        .in(
          "id",
          [q.supplier_company_id, q.buyer_company_id].filter(
            (v): v is string => Boolean(v)
          )
        ),
      supabase
        .from("enquiries")
        .select("reference, product_name_snapshot")
        .eq("id", q.enquiry_id)
        .maybeSingle(),
    ]);

  const minorUnits = cur?.minor_units ?? 2;
  const money = (m: number | null) => formatMinor(m, q.currency, minorUnits);

  const byId = new Map(
    ((parties ?? []) as {
      id: string;
      legal_name: string;
      trading_name: string | null;
      country_code: string | null;
    }[]).map((c) => [c.id, c])
  );
  const supplier = byId.get(q.supplier_company_id);

  /**
   * The buyer may be a shopper, who is a person and has no company row.
   * Reading the name from profiles keeps the page honest about who it was
   * quoted to, and iAmBuyer has to account for them or the Accept button
   * never appears for the one person entitled to press it.
   */
  let buyer = q.buyer_company_id ? byId.get(q.buyer_company_id) : undefined;
  if (!buyer && q.buyer_profile_id) {
    const { data: person } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", q.buyer_profile_id)
      .maybeSingle();
    const name = (person as { full_name: string | null } | null)?.full_name;
    buyer = {
      id: q.buyer_profile_id,
      legal_name: name || "A shopper",
      trading_name: null,
      country_code: null,
    };
  }

  const iAmBuyer = q.buyer_company_id
    ? mine.has(q.buyer_company_id)
    : q.buyer_profile_id === user.id;
  const iAmSupplier = mine.has(q.supplier_company_id);
  const canAnswer = iAmBuyer && q.status === "sent";

  const badge = QUOTATION_STATUS[q.status] ?? {
    label: q.status,
    tone: "bg-sand text-stone",
  };

  const accept = respondToQuotation.bind(null, q.id, "accepted");
  const decline = respondToQuotation.bind(null, q.id, "rejected");

  const rows = (lines ?? []) as {
    id: string;
    description: string;
    quantity: number;
    unit_code: string;
    unit_price_minor: number;
    line_total_minor: number;
  }[];

  return (
    <>
      <div className="mb-6">
        <Link href="/account/quotations" className="link-quiet text-sm text-ink-soft">
          &larr; All quotations
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-3xl sm:text-4xl">{q.reference}</h1>
          <span className={`rounded px-3 py-1 text-sm font-medium ${badge.tone}`}>
            {iAmSupplier && q.status === "sent" ? "Awaiting their reply" : badge.label}
          </span>
        </div>
        <p className="mt-2 text-ink-soft">
          {supplier?.trading_name || supplier?.legal_name || "A supplier"} to{" "}
          {buyer?.trading_name || buyer?.legal_name || "a buyer"}
          {enquiry?.reference && <> · against enquiry {enquiry.reference}</>}
        </p>
      </div>

      {sent === "1" && iAmSupplier && (
        <p className="mb-6 rounded-lg border-l-2 border-forest bg-forest/5 px-5 py-4 text-ink">
          Sent. The buyer has been notified and can accept or decline it here.
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-sand-deep bg-paper shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-sand-deep text-[0.7rem] tracking-widest text-stone uppercase">
              <th scope="col" className="px-5 py-3.5 font-semibold">Description</th>
              <th scope="col" className="px-5 py-3.5 text-right font-semibold">Quantity</th>
              <th scope="col" className="px-5 py-3.5 text-right font-semibold">Unit price</th>
              <th scope="col" className="px-5 py-3.5 text-right font-semibold">Line total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-b border-sand last:border-0">
                <td className="px-5 py-4 text-ink">{l.description}</td>
                <td className="tabular px-5 py-4 text-right text-ink-soft">
                  {formatQuantity(l.quantity)} {l.unit_code}
                </td>
                <td className="tabular px-5 py-4 text-right text-ink-soft">
                  {money(l.unit_price_minor)}
                </td>
                <td className="tabular px-5 py-4 text-right font-medium text-ink">
                  {money(l.line_total_minor)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-sand/40">
            <tr>
              <td colSpan={3} className="px-5 py-2.5 text-right text-ink-soft">Subtotal</td>
              <td className="tabular px-5 py-2.5 text-right text-ink">{money(q.subtotal_minor)}</td>
            </tr>
            {q.shipping_minor > 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-2.5 text-right text-ink-soft">Shipping</td>
                <td className="tabular px-5 py-2.5 text-right text-ink">{money(q.shipping_minor)}</td>
              </tr>
            )}
            {q.other_charges_minor > 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-2.5 text-right text-ink-soft">Other charges</td>
                <td className="tabular px-5 py-2.5 text-right text-ink">
                  {money(q.other_charges_minor)}
                </td>
              </tr>
            )}
            <tr className="border-t border-sand-deep">
              <td colSpan={3} className="px-5 py-4 text-right font-semibold text-ink">Total</td>
              <td className="tabular px-5 py-4 text-right text-lg font-semibold text-forest">
                {money(q.total_minor)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="mt-6 rounded-xl border border-sand-deep bg-paper p-6 shadow-sm">
        <h2 className="text-xl">Terms</h2>
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {[
            ["Incoterm", q.incoterm],
            ["Lead time", q.lead_time_days ? `${q.lead_time_days} days` : null],
            ["Payment terms", q.payment_terms],
            ["Packaging", q.packaging_notes],
            ["Valid until", date(q.valid_until)],
            ["Sent", date(q.sent_at)],
          ].map(([k, v]) => (
            <div key={String(k)}>
              <dt className="text-xs tracking-wide text-stone uppercase">{k}</dt>
              <dd className="mt-0.5 text-ink">{v || <span className="text-stone">Not stated</span>}</dd>
            </div>
          ))}
        </dl>
        {q.notes && (
          <p className="mt-5 border-t border-sand pt-4 leading-relaxed text-ink-soft">{q.notes}</p>
        )}
      </section>

      {q.status === "rejected" && q.decline_reason && (
        <section className="mt-6 rounded-lg border-l-2 border-gold bg-sand px-5 py-4">
          <p className="text-xs font-semibold tracking-wide text-stone uppercase">
            Why it was declined
          </p>
          <p className="mt-1.5 leading-relaxed text-ink">{q.decline_reason}</p>
        </section>
      )}

      {canAnswer && (
        <div className="mt-6">
          <QuotationDecision accept={accept} decline={decline} />
        </div>
      )}

      {q.status === "accepted" && (
        <section className="mt-6 rounded-lg border-l-2 border-forest bg-forest/5 px-5 py-4">
          <p className="text-ink">
            Accepted{q.responded_at ? ` on ${date(q.responded_at)}` : ""}. These are
            the agreed terms. Payment and delivery are arranged between the two
            companies directly for now; handling them on the platform comes with
            Stage 4.
          </p>
        </section>
      )}

      {iAmSupplier && q.status === "rejected" && (
        <div className="mt-6">
          <Link
            href={`/account/enquiries/${q.enquiry_id}/quote`}
            className="btn-lift btn-primary"
          >
            Quote again
          </Link>
        </div>
      )}
    </>
  );
}
