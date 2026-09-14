import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase-server";
import AdminShell from "@/components/admin/Shell";
import LeadsView from "@/components/admin/LeadsView";

export const dynamic = "force-dynamic";

export default async function BuyersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { q } = await searchParams;

  return (
    <AdminShell admin={admin} title="Buyers" subtitle="Retailers, importers and manufacturers who have registered">
      <LeadsView
        leadType={"buyer"}
        basePath="/admin/buyers"
        q={q}
        emptyMessage="No buyers yet. Registrations from the retailer form appear here."
      />
    </AdminShell>
  );
}
