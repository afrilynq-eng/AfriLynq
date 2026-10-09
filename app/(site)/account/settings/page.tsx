import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase-server";
import SettingsForm from "@/components/account/SettingsForm";
import SignOutButton from "@/components/account/SignOutButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="space-y-6">
      <SettingsForm
        firstName={user.first_name ?? ""}
        lastName={user.last_name ?? ""}
        email={user.email}
        phone={user.phone ?? ""}
        countryCode={user.country_code ?? ""}
      />

      <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
        <h2 className="text-xl">Signing out</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          Sign out on a shared or public computer. Your company and documents
          stay exactly as they are.
        </p>
        <div className="mt-5">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
