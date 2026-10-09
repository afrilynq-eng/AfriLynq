import { redirect } from "next/navigation";
import {
  currentUser,
  userCompanies,
  certificationCounts,
  greetingName,
} from "@/lib/supabase-server";
import PortalShell, { type PortalStep } from "@/components/account/PortalShell";

export const dynamic = "force-dynamic";

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

  const done = {
    account: true,
    company: Boolean(primary),
    documents: documents > 0,
    submitted: ["pending", "verified", "rejected"].includes(status),
    verified: status === "verified",
  };

  const labels: [keyof typeof done, string][] = [
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

  return (
    <PortalShell
      name={greetingName(user)}
      email={user.email}
      isAdmin={user.platform_role === "admin"}
      hasCompany={Boolean(primary)}
      steps={steps}
    >
      {children}
    </PortalShell>
  );
}
