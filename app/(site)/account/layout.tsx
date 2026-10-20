import { redirect } from "next/navigation";
import {
  currentUser,
  userCompanies,
  certificationCounts,
  greetingName,
  sessionClient,
} from "@/lib/supabase-server";
import PortalShell, {
  type PortalStep,
  type PortalCounts,
  type PortalRole,
} from "@/components/account/PortalShell";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  supplier: "Supplier",
  buyer: "Buyer",
  both: "Supplier and buyer",
};

/**
 * Everything under /account runs behind this.
 *
 * The sign in check sits here rather than being repeated on each page, so a
 * page added later cannot be left unguarded by forgetting a line.
 *
 * The progress strip is also worked out here, once, from the first company.
 * Someone with several companies is rare and is past onboarding by
 * definition, so the strip follows the one they created first rather than
 * trying to average a state across all of them.
 */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const companies = await userCompanies();
  const counts = await certificationCounts(companies.map((c) => c.id));

  const primary = companies[0] ?? null;
  const documents = primary ? (counts[primary.id] ?? 0) : 0;
  const status = primary?.verification_status ?? "unverified";

  // Which half of the market this person is on. A company that trades both
  // ways gets both sets of links rather than being forced to pick.
  const role: PortalRole =
    primary?.company_type === "buyer"
      ? "buyer"
      : primary?.company_type === "both"
        ? "both"
        : "supplier";

  const done = {
    account: true,
    company: Boolean(primary),
    documents: documents > 0,
    submitted: ["pending", "verified", "rejected"].includes(status),
    verified: status === "verified",
  };

  // A retailer uploads nothing and submits nothing: we check them, and they
  // either pass or they are waiting on us. Showing them a supplier's five
  // steps would be asking for work that does not exist.
  const labels: [keyof typeof done, string][] =
    role === "buyer"
      ? [
          ["account", "Account created"],
          ["company", "Company added"],
          ["submitted", "Buyer check"],
          ["verified", "Verified buyer"],
        ]
      : [
          ["account", "Account created"],
          ["company", "Company added"],
          ["documents", "Documents uploaded"],
          ["submitted", "Submitted for review"],
          ["verified", "Verified"],
        ];

  // The first thing not yet done is the thing to do next. Marking only one
  // step current is what stops the strip reading as a list of demands.
  const firstOpen = labels.findIndex(([key]) => !done[key]);

  const steps: PortalStep[] = labels.map(([key, label], i) => ({
    label,
    done: done[key],
    current: i === firstOpen,
  }));

  const badges = primary
    ? await sidebarCounts(companies.map((c) => c.id), role)
    : ({} as PortalCounts);

  return (
    <PortalShell
      role={role}
      name={greetingName(user)}
      email={user.email}
      companyLine={
        primary
          ? `${primary.trading_name || primary.legal_name} (${TYPE_LABEL[primary.company_type] ?? primary.company_type})`
          : null
      }
      isAdmin={user.platform_role === "admin"}
      hasCompany={Boolean(primary)}
      steps={steps}
      counts={badges}
    >
      {children}
    </PortalShell>
  );
}

/**
 * The numbers beside the sidebar links.
 *
 * A badge means "something here is waiting on you", not "here is a total":
 * listings counts drafts rather than everything, documents counts the ones
 * that need action. A badge that only ever grows gets ignored within a week.
 *
 * Every query runs through the session client, so row level security keeps
 * this to companies the person actually belongs to.
 */
async function sidebarCounts(
  companyIds: string[],
  role: PortalRole
): Promise<PortalCounts> {
  const supabase = await sessionClient();
  const head = { count: "exact" as const, head: true };

  // A retailer's badge is the requests that have come BACK, not the ones
  // still out. A badge means something is waiting on you, and a request
  // sitting with a supplier is waiting on them.
  const mine = await supabase
    .from("enquiries")
    .select("id", head)
    .in("buyer_company_id", companyIds)
    .eq("status", "quoted");

  const [drafts, enquiries, docs, threads] = await Promise.all([
    supabase.from("products").select("id", head).in("company_id", companyIds).eq("status", "draft"),
    supabase.from("enquiries").select("id", head).in("supplier_company_id", companyIds).eq("status", "open"),
    supabase
      .from("certifications")
      .select("id", head)
      .in("company_id", companyIds)
      .in("status", ["pending", "rejected", "expired"]),
    supabase.from("message_threads").select("id").in("supplier_company_id", companyIds),
  ]);

  // Unread is counted over the person's own threads rather than with a join,
  // because a head count through an embedded table cannot be filtered the way
  // this needs and two small queries are cheaper than getting that wrong.
  let unread = 0;
  const threadIds = (threads.data ?? []).map((t) => t.id as string);
  if (threadIds.length > 0) {
    const { count } = await supabase
      .from("messages")
      .select("id", head)
      .in("thread_id", threadIds)
      .not("sender_company_id", "in", `(${companyIds.join(",")})`)
      .is("read_by_supplier_at", null);
    unread = count ?? 0;
  }

  return {
    "/account/products": drafts.count ?? 0,
    "/account/enquiries": role === "buyer" ? 0 : (enquiries.count ?? 0),
    "/account/requests": mine.count ?? 0,
    "/account/documents": docs.count ?? 0,
    "/account/messages": unread,
  };
}
