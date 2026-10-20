import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase-server";
import AuthForm from "@/components/auth/AuthForm";
import { authErrorMessage } from "@/lib/auth-errors";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in to AfriLynq",
  description: "Sign in to manage your company, listings and enquiries.",
  alternates: { canonical: "/sign-in" },
  robots: { index: false, follow: true },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // A failed social sign-in or an expired confirmation link lands
  // back here with a code. Without this the person is returned to a
  // blank form and left to guess what happened.
  const { error } = await searchParams;
  if (await currentUser()) redirect("/account");

  return (
    <section className="mx-auto max-w-md px-6 py-16">
      <AuthForm mode="sign-in" initialError={authErrorMessage(error)} />
    </section>
  );
}
