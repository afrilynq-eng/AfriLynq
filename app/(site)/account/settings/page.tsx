import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase-server";
import { catalogueLabels } from "@/lib/catalogue";
import SettingsForm from "@/components/account/SettingsForm";
import InterestsForm from "@/components/account/InterestsForm";
import SignOutButton from "@/components/account/SignOutButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Settings must not fail to render because a reference query did.
  const labels = await catalogueLabels().catch(() => ({ categories: [], units: [] }));

  // A supplier lists what they sell on their listings, not here, so the
  // question only reads correctly for the two buying sides.
  const buying = user.account_type === "shopper" || user.account_type === "buyer";

  return (
    <div className="space-y-6">
      <SettingsForm
        firstName={user.first_name ?? ""}
        lastName={user.last_name ?? ""}
        email={user.email}
        phone={user.phone ?? ""}
        countryCode={user.country_code ?? ""}
        personal={user.account_type === "shopper"}
      />

      {buying && (
        <InterestsForm
          categories={labels.categories}
          selected={user.interest_slugs ?? []}
          heading={
            user.account_type === "shopper"
              ? "What you are looking for"
              : "What you want to source"
          }
          hint={
            user.account_type === "shopper"
              ? "We put these at the top of your overview. Change them whenever you like."
              : "Used to show you the right suppliers first. Change them whenever you like."
          }
        />
      )}

      <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
        <h2 className="text-xl">Signing out</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          Sign out on a shared or public computer.{" "}
          {user.account_type === "shopper"
            ? "Your requests stay exactly as they are."
            : "Your company and documents stay exactly as they are."}
        </p>
        <div className="mt-5">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
