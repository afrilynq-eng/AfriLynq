import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase-server";
import AuthForm from "@/components/auth/AuthForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in to AfriLynq",
  description: "Sign in to manage your company, listings and enquiries.",
  alternates: { canonical: "/sign-in" },
  robots: { index: false, follow: true },
};

export default async function SignInPage() {
  if (await currentUser()) redirect("/account");

  return (
    <section className="mx-auto max-w-md px-6 py-16">
      <AuthForm mode="sign-in" />
    </section>
  );
}
