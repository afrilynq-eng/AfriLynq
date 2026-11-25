import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import { csvBody, csvResponse, majorUnits } from "@/lib/csv";
import { minorUnitsMap } from "@/lib/admin-money";

export const dynamic = "force-dynamic";

/**
 * Supplier payment records, exportable.
 *
 * This is the file a supplier gets sent when they ask what they have been
 * paid, and the file an accountant wants at the end of a quarter, so it
 * shows the whole sum: what the buyer paid, what AfriLynq kept, what the
 * supplier was owed, and what actually left in their own currency once a
 * rate and a transfer fee had been applied. A payout that only showed the
 * final figure would be a number nobody could check.
 */
export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return new Response("Not authorised", { status: 401 });
  }

  const status = new URL(request.url).searchParams.get("status");
  const svc = serviceClient();

  let query = svc
    .from("payouts")
    .select(
      "reference, status, currency, gross_minor, commission_rate, commission_minor, net_minor, " +
        "disputed, manual, payout_currency, payout_amount_minor, exchange_rate, " +
        "transfer_fee_minor, provider, provider_transfer_id, approved_at, sent_at, paid_at, " +
        "failed_reason, notes, created_at, order_id, supplier_company_id"
    )
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const [{ data, error }, units] = await Promise.all([query, minorUnitsMap(svc)]);
  if (error) return new Response(`Could not export: ${error.message}`, { status: 500 });

  const payouts = (data ?? []) as unknown as Record<string, unknown>[];

  const companyIds = [...new Set(payouts.map((p) => String(p.supplier_company_id)))].filter(Boolean);
  const orderIds = [...new Set(payouts.map((p) => String(p.order_id)))].filter(Boolean);

  const [companiesRes, ordersRes] = await Promise.all([
    companyIds.length
      ? svc
          .from("companies")
          .select("id, legal_name, trading_name, country_code")
          .in("id", companyIds)
      : Promise.resolve({ data: [] }),
    orderIds.length
      ? svc.from("orders").select("id, reference, status").in("id", orderIds)
      : Promise.resolve({ data: [] }),
  ]);

  const companies = new Map(
    ((companiesRes.data ?? []) as {
      id: string;
      legal_name: string;
      trading_name: string | null;
      country_code: string | null;
    }[]).map((c) => [c.id, c] as const)
  );
  const orders = new Map(
    ((ordersRes.data ?? []) as unknown as { id: string; reference: string; status: string }[])
      .map((o) => [o.id, o] as const)
  );

  const columns = [
    "payout_reference",
    "date",
    "status",
    "order_reference",
    "order_status",
    "supplier",
    "supplier_country",
    "currency",
    "buyer_paid",
    "service_charge_rate",
    "service_charge",
    "supplier_net",
    "reduced_by_dispute",
    "settled_by_hand",
    "sent_currency",
    "sent_amount",
    "exchange_rate",
    "transfer_fee",
    "provider",
    "provider_transfer_id",
    "approved_at",
    "sent_at",
    "paid_at",
    "failed_reason",
    "notes",
  ] as const;

  const rows = payouts.map((p) => {
    const currency = String(p.currency ?? "");
    const scale = units[currency] ?? 2;
    const company = companies.get(String(p.supplier_company_id));
    const order = orders.get(String(p.order_id));
    const sentCurrency = p.payout_currency ? String(p.payout_currency) : "";

    return {
      payout_reference: p.reference,
      date: p.created_at,
      status: p.status,
      order_reference: order?.reference ?? "",
      order_status: order?.status ?? "",
      supplier: company?.trading_name || company?.legal_name || "",
      supplier_country: company?.country_code ?? "",
      currency,
      buyer_paid: majorUnits(p.gross_minor as number, scale),
      service_charge_rate: p.commission_rate,
      service_charge: majorUnits(p.commission_minor as number, scale),
      supplier_net: majorUnits(p.net_minor as number, scale),
      reduced_by_dispute: p.disputed ? "yes" : "no",
      settled_by_hand: p.manual ? "yes" : "no",
      sent_currency: sentCurrency,
      sent_amount: sentCurrency
        ? majorUnits(p.payout_amount_minor as number | null, units[sentCurrency] ?? 2)
        : "",
      exchange_rate: p.exchange_rate,
      transfer_fee: sentCurrency
        ? majorUnits(p.transfer_fee_minor as number | null, units[sentCurrency] ?? 2)
        : "",
      provider: p.provider,
      provider_transfer_id: p.provider_transfer_id,
      approved_at: p.approved_at,
      sent_at: p.sent_at,
      paid_at: p.paid_at,
      failed_reason: p.failed_reason,
      notes: p.notes,
    };
  });

  return csvResponse(csvBody(columns, rows), status ? `payouts-${status}` : "payouts");
}
