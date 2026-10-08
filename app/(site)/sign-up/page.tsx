import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase-server";
import AuthForm from "@/components/auth/AuthForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create your AfriLynq account",
  description:
    "One free account to list produce as a supplier or to source it as a buyer.",
  alternates: { canonical: "/sign-up" },
  robots: { index: false, follow: true },
};

export default async function SignUpPage() {
  // Somebody already signed in has nothing to do here.
  if (await currentUser()) redirect("/account");

  return (
    <section className="mx-auto max-w-md px-6 py-16">
      <AuthForm mode="sign-up" />
    </section>
  );
}
