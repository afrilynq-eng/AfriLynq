import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase-server";
import AdminShell from "@/components/admin/Shell";
import LeadsView from "@/components/admin/LeadsView";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { q } = await searchParams;

  return (
    <AdminShell admin={admin} title="Suppliers" subtitle="Farmers, co-operatives, processors and exporters who have registered">
      <LeadsView
        leadType={"supplier"}
        basePath="/admin/suppliers"
        q={q}
        emptyMessage="No suppliers yet. Registrations from the farmer form appear here."
      />
    </AdminShell>
  );
}
