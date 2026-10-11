import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { userCompanies, reference } from "@/lib/supabase-server";
import ProductForm from "@/components/account/ProductForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Add a listing",
  robots: { index: false, follow: false },
};

export default async function NewProductPage() {
  const companies = await userCompanies();
  const company = companies[0];
  if (!company) redirect("/account/company/new");

  const ref = await reference();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/account/products" className="link-quiet text-sm text-ink-soft">
          &larr; Back to your listings
        </Link>
        <h2 className="mt-2 text-2xl">Add a listing</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Save it first, then add the photographs.
        </p>
      </div>

      <ProductForm companyId={company.id} product={null} reference={ref} />
    </div>
  );
}
