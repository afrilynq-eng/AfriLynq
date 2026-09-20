import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase-server";
import AdminShell from "@/components/admin/Shell";
import LeadsView from "@/components/admin/LeadsView";

export const dynamic = "force-dynamic";

export default async function ShoppersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { q } = await searchParams;

  return (
    <AdminShell
      admin={admin}
      title="Shoppers"
      subtitle="Households, restaurants, shops and market traders buying for themselves"
    >
      <LeadsView
        leadType="shopper"
        basePath="/admin/shoppers"
        q={q}
        emptyMessage="No shoppers yet. Registrations from the shopper form appear here."
      />
    </AdminShell>
  );
}
