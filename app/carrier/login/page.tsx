import { redirect } from "next/navigation";
import { currentCarrier } from "@/lib/carrier";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function CarrierLoginPage() {
  // Already signed in as a carrier, so skip the form.
  const account = await currentCarrier();
  if (account) redirect("/carrier");

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-5 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-2xl font-extrabold tracking-tight text-forest">
            Afri<span className="text-gold">Lynq</span>
          </div>
          <div className="mt-3 inline-block rounded-md bg-gold px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#04281a]">
            Carrier portal
          </div>
        </div>

        <div className="rounded-xl border border-sand-deep bg-white p-7">
          <h1 className="text-xl font-extrabold tracking-tight">Sign in</h1>
          <p className="mt-2 mb-6 text-[13px] leading-relaxed text-stone">
            For logistics partners moving consignments for AfriLynq. If you do
            not have a login, ask your contact at AfriLynq to create one.
          </p>
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-[12px] leading-relaxed text-stone">
          This page is for carriers only. Buyers and suppliers sign in from the
          main site.
        </p>
      </div>
    </div>
  );
}
