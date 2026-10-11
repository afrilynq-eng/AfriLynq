import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  userCompanies,
  productDetail,
  productImages,
  reference,
} from "@/lib/supabase-server";
import ProductForm from "@/components/account/ProductForm";
import ProductImagesPanel from "@/components/account/ProductImages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit listing",
  robots: { index: false, follow: false },
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const companies = await userCompanies();
  const company = companies[0];
  if (!company) redirect("/account/company/new");

  // productDetail reads through row level security, so a listing that is
  // not this user's comes back null rather than needing a check here.
  const product = await productDetail(id);
  if (!product || product.company_id !== company.id) redirect("/account/products");

  const [images, ref] = await Promise.all([productImages(id), reference()]);

  // product-images is a public bucket, so paths resolve without signing.
  const publicBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/account/products" className="link-quiet text-sm text-ink-soft">
          &larr; Back to your listings
        </Link>
        <h2 className="mt-2 text-2xl">{product.name}</h2>
      </div>

      <ProductImagesPanel
        companyId={company.id}
        productId={product.id}
        images={images}
        publicBase={publicBase}
      />

      <ProductForm
        companyId={company.id}
        product={product}
        reference={ref}
      />
    </div>
  );
}
