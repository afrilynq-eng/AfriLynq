import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin, isConfigured } from "@/lib/supabase-server";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (await requireAdmin()) redirect("/admin");

  if (!isConfigured()) {
    return (
      <section className="mx-auto max-w-md px-6 py-20">
        <h1 className="text-3xl">Administration</h1>
        <p className="mt-4 border-l-2 border-gold bg-sand px-4 py-3 text-sm leading-relaxed">
          Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local and restart the server.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-3xl">Administration</h1>
      <p className="mt-3 text-ink-soft">
        Sign in with your AfriLynq administrator account.
      </p>
      <LoginForm />
    </section>
  );
}
