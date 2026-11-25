import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import { csvBody, csvResponse, majorUnits } from "@/lib/csv";
import { minorUnitsMap } from "@/lib/admin-money";

export const dynamic = "force-dynamic";

/**
 * Downloadable transaction report, which Collins asked for by name.
 *
 * Amounts come out as plain decimals in their own currency, with the
 * currency in its own column. A spreadsheet that mixes pounds and euros in
 * one column of numbers is a spreadsheet somebody will eventually total.
 *
 * The provider's raw response is never exported. It is the evidence if a
 * payment is argued about, it lives in the database, and it has no place
 * in a file that gets emailed around.
 */
export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return new Response("Not authorised", { status: 401 });
  }

  const status = new URL(request.url).searchParams.get("status");
  const svc = serviceClient();

  let query = svc
    .from("payments")
    .select(
      "reference, status, currency, amount_minor, settled_minor, provider_fee_minor, " +
        "provider, provider_tx_id, payment_method, verified_at, failed_reason, created_at, " +
        "order_id, buyer_company_id, buyer_profile_id, supplier_company_id"
    )
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const [{ data, error }, units] = await Promise.all([query, minorUnitsMap(svc)]);
  if (error) return new Response(`Could not export: ${error.message}`, { status: 500 });

  const payments = (data ?? []) as unknown as Record<string, unknown>[];

  // Names rather than identifiers. A report full of UUIDs helps nobody.
  const companyIds = new Set<string>();
  const profileIds = new Set<string>();
  const orderIds = new Set<string>();
  for (const p of payments) {
    if (p.supplier_company_id) companyIds.add(String(p.supplier_company_id));
    if (p.buyer_company_id) companyIds.add(String(p.buyer_company_id));
    if (p.buyer_profile_id) profileIds.add(String(p.buyer_profile_id));
    if (p.order_id) orderIds.add(String(p.order_id));
  }

  const [companiesRes, profilesRes, ordersRes] = await Promise.all([
    companyIds.size
      ? svc.from("companies").select("id, legal_name, trading_name").in("id", [...companyIds])
      : Promise.resolve({ data: [] }),
    profileIds.size
      ? svc.from("profiles").select("id, full_name").in("id", [...profileIds])
      : Promise.resolve({ data: [] }),
    orderIds.size
      ? svc.from("orders").select("id, reference, commission_minor").in("id", [...orderIds])
      : Promise.resolve({ data: [] }),
  ]);

  const companies = new Map(
    ((companiesRes.data ?? []) as { id: string; legal_name: string; trading_name: string | null }[])
      .map((c) => [c.id, c.trading_name || c.legal_name] as const)
  );
  const people = new Map(
    ((profilesRes.data ?? []) as { id: string; full_name: string | null }[])
      .map((p) => [p.id, p.full_name || "Shopper"] as const)
  );
  const orders = new Map(
    ((ordersRes.data ?? []) as unknown as {
      id: string;
      reference: string;
      commission_minor: number | null;
    }[]).map((o) => [o.id, o] as const)
  );

  const columns = [
    "payment_reference",
    "date",
    "status",
    "order_reference",
    "buyer",
    "supplier",
    "currency",
    "amount",
    "service_charge",
    "settled_amount",
    "provider_fee",
    "provider",
    "provider_transaction_id",
    "payment_method",
    "verified_at",
    "failed_reason",
  ] as const;

  const rows = payments.map((p) => {
    const currency = String(p.currency ?? "");
    const scale = units[currency] ?? 2;
    const order = p.order_id ? orders.get(String(p.order_id)) : undefined;

    return {
      payment_reference: p.reference,
      date: p.created_at,
      status: p.status,
      order_reference: order?.reference ?? "",
      buyer: p.buyer_company_id
        ? (companies.get(String(p.buyer_company_id)) ?? "")
        : p.buyer_profile_id
          ? (people.get(String(p.buyer_profile_id)) ?? "Shopper")
          : "",
      supplier: companies.get(String(p.supplier_company_id)) ?? "",
      currency,
      amount: majorUnits(p.amount_minor as number, scale),
      service_charge:
        p.status === "successful" && order?.commission_minor != null
          ? majorUnits(order.commission_minor, scale)
          : "",
      settled_amount: majorUnits(p.settled_minor as number | null, scale),
      provider_fee: majorUnits(p.provider_fee_minor as number | null, scale),
      provider: p.provider,
      provider_transaction_id: p.provider_tx_id,
      payment_method: p.payment_method,
      verified_at: p.verified_at,
      failed_reason: p.failed_reason,
    };
  });

  return csvResponse(csvBody(columns, rows), status ? `payments-${status}` : "payments");
}
