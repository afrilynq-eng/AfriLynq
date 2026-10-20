import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/supabase-server";
import OtpForm from "@/components/auth/OtpForm";
import AuthSteps from "@/components/auth/AuthSteps";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verify your email",
  alternates: { canonical: "/verify" },
  robots: { index: false, follow: false },
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  // Already confirmed and signed in: there is nothing to verify.
  if (await currentUser()) redirect("/account");

  const { email } = await searchParams;
  const address = (email ?? "").trim();

  return (
    <section className="mx-auto max-w-2xl px-6 py-14">
      <AuthSteps current={2} />

      <div className="mt-10">
        {address ? (
          <OtpForm email={address} />
        ) : (
          /**
           * Someone opened /verify directly, or the address was stripped
           * on the way. Without it there is no account to check the code
           * against, so sending them back is the only honest answer.
           */
          <div className="rounded-xl bg-paper p-8 text-center shadow-lg ring-1 ring-sand-deep">
            <h1 className="text-2xl font-semibold text-forest">
              Which account are we verifying?
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
              This page needs the email address you signed up with. Start from
              the form again, or press the link in the email we sent you.
            </p>
            <Link
              href="/sign-up"
              className="btn-lift mt-6 inline-block rounded-lg bg-forest px-7 py-3.5 font-medium text-paper transition-colors hover:bg-gold hover:text-forest-deep"
            >
              Back to sign up
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
