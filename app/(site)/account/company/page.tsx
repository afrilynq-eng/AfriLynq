import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { userCompanies, companyDetail } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import CompanyProfileForm from "@/components/account/CompanyProfileForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Company profile",
  robots: { index: false, follow: false },
};

export default async function CompanyProfilePage() {
  const companies = await userCompanies();
  const first = companies[0];
  if (!first) redirect("/account/company/new");

  const company = await companyDetail(first.id);
  if (!company) redirect("/account");

  // company-public is a public bucket, so the logo needs no signing. The
  // URL is built from the stored path rather than kept in the database,
  // which means moving the project or the bucket does not strand it.
  const logoUrl = company.logo_path
    ? serviceClient().storage.from("company-public").getPublicUrl(company.logo_path)
        .data.publicUrl
    : null;

  return <CompanyProfileForm company={company} logoUrl={logoUrl} />;
}
