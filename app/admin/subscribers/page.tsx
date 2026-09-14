import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase-server";
import AdminShell from "@/components/admin/Shell";
import LeadsView from "@/components/admin/LeadsView";

export const dynamic = "force-dynamic";

export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { q } = await searchParams;

  return (
    <AdminShell admin={admin} title="Subscribers" subtitle="Sign ups from the subscription band and general enquiries">
      <LeadsView
        leadType={"other"}
        basePath="/admin/subscribers"
        q={q}
        emptyMessage="No subscribers yet. Sign ups from the subscription band appear here."
      />
    </AdminShell>
  );
}
