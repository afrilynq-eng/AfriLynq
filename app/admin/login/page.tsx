import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { requireAdmin, isConfigured } from "@/lib/supabase-server";
import markReverse from "@/public/brand/mark-reverse.png";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (await requireAdmin()) redirect("/admin");

  return (
    <div className="admin flex min-h-screen items-center justify-center bg-[#071B12] px-6 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Image
            src={markReverse}
            alt=""
            width={242}
            height={146}
            priority
            className="mx-auto h-14 w-auto"
          />
          <p className="mt-5 text-3xl font-semibold !text-white">
            Afri<span className="text-gold">Lynq</span>
          </p>
          <p className="mt-1.5 text-white/45">
            Connecting African harvests to global markets
          </p>
        </div>

        <div className="mt-9 overflow-hidden rounded-xl bg-white/[0.04] ring-1 ring-white/8">
          <div className="bg-forest px-7 py-6">
            <h1 className="text-xl !text-white">Sign in to your dashboard</h1>
            <p className="mt-1 text-sm text-white/60">
              Enter your credentials to continue
            </p>
          </div>

          <div className="px-7 py-7">
            {isConfigured() ? (
              <LoginForm />
            ) : (
              <p className="rounded border-l-2 border-gold bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-white/75">
                Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and
                NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the server.
              </p>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-white/35">
          Administrator accounts are created by AfriLynq. There is no public sign up.
        </p>
      </div>
    </div>
  );
}
