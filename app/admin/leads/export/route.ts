import { requireAdmin, sessionClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * CSV export of the leads table.
 *
 * Guarded by the same admin check as the page. It reads through the session
 * client, so row level security applies here too rather than the export being
 * a quiet way around it.
 */
export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return new Response("Not authorised", { status: 401 });
  }

  const type = new URL(request.url).searchParams.get("type");
  const supabase = await sessionClient();

  let query = supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (type === "buyer" || type === "supplier") query = query.eq("lead_type", type);

  const { data, error } = await query;
  if (error) return new Response(`Could not export: ${error.message}`, { status: 500 });

  const columns = [
    "created_at",
    "lead_type",
    "full_name",
    "email",
    "phone",
    "company_name",
    "country_code",
    "categories_of_interest",
    "message",
    "source",
  ];

  const rows = (data ?? []).map((row: Record<string, unknown>) =>
    columns.map((c) => csvCell(row[c])).join(",")
  );

  const csv = [columns.join(","), ...rows].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="afrilynq-leads-${stamp}.csv"`,
    },
  });
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) ? value.join("; ") : String(value);
  // A leading =, +, - or @ is treated as a formula by Excel, so prefix it.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
