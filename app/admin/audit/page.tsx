import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import AdminShell, { Panel } from "@/components/admin/Shell";

export const dynamic = "force-dynamic";

interface Entry {
  id: number;
  created_at: string;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  after_state: Record<string, unknown> | null;
}

const LABEL: Record<string, string> = {
  "company.submitted": "Submitted for verification",
  "company.verified": "Approved company",
  "company.rejected": "Rejected company",
  "company.suspended": "Suspended company",
};

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function detail(e: Entry) {
  const a = e.after_state ?? {};
  const parts: string[] = [];
  if (typeof a.notes === "string" && a.notes) parts.push(a.notes);
  if (typeof a.documents === "number") parts.push(`${a.documents} document(s)`);
  return parts.join(" . ");
}

export default async function AuditPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { data } = await serviceClient()
    .from("audit_log")
    .select("id, created_at, actor_email, action, entity_type, entity_id, after_state")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as Entry[];

  return (
    <AdminShell
      admin={admin}
      title="Audit log"
      subtitle="Who did what, and when. Entries cannot be edited."
    >
      <Panel title={`Latest ${rows.length} events`}>
        {rows.length === 0 ? (
          <p className="py-12 text-center text-white/45">Nothing recorded yet.</p>
        ) : (
          <ul className="divide-y divide-white/6">
            {rows.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0"
              >
                <span className="min-w-0">
                  <span className="text-white/80">{LABEL[e.action] ?? e.action}</span>
                  <span className="block text-xs text-white/35">
                    {[e.actor_email ?? "System", detail(e)].filter(Boolean).join(" . ")}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-white/40">
                  {when(e.created_at)}
                  {e.entity_type === "company" && e.entity_id && (
                    <a
                      href={`/admin/companies/${e.entity_id}`}
                      className="ml-3 text-gold hover:underline"
                    >
                      Open
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </AdminShell>
  );
}