import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase-server";
import CompanyForm from "@/components/account/CompanyForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create your company",
  robots: { index: false, follow: false },
};

export default async function NewCompanyPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <CompanyForm defaultEmail={user.email} />
    </section>
  );
}
