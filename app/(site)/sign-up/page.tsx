import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase-server";
import { authErrorMessage } from "@/lib/auth-errors";
import SignUpForm from "@/components/auth/SignUpForm";
import AuthSteps from "@/components/auth/AuthSteps";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create your AfriLynq account",
  description:
    "One free account to list produce as a supplier or to source it as a buyer.",
  alternates: { canonical: "/sign-up" },
  robots: { index: false, follow: true },
};

const NEXT = [
  {
    title: "Confirm your email",
    body: "We send a 6-digit code. It takes a few seconds.",
  },
  {
    title: "Add your company",
    body: "Name, registration number and what you trade in.",
  },
  {
    title: "Upload your documents",
    body: "Certificate of registration and any trade certificates. We review them within two working days.",
  },
];

const WHY = [
  "Buyers see verified suppliers only, so your documents are what win you the enquiry.",
  "List produce, set your own prices and decide which of them are public.",
  "Enquiries come straight to you. No commission on what you agree.",
  "Free to join and free to list.",
];

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // A failed social sign-in or an expired confirmation link lands back
  // here with a code. Without this the person is returned to a blank form
  // and left to guess what happened.
  const { error } = await searchParams;

  // Somebody already signed in has nothing to do here.
  if (await currentUser()) redirect("/account");

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-semibold text-forest sm:text-4xl">
          Create your AfriLynq account
        </h1>
        <p className="mt-3 text-ink-soft">
          Free to join. Three steps to a verified listing.
        </p>
      </div>

      <div className="mt-9">
        <AuthSteps current={1} />
      </div>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <SignUpForm initialError={authErrorMessage(error)} />

        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="rounded-xl border border-sand-deep bg-sand/50 p-6">
            <h2 className="text-xs font-semibold tracking-widest text-forest uppercase">
              What happens next
            </h2>
            <ol className="mt-4 space-y-4">
              {NEXT.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-semibold text-paper">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">
                      {s.title}
                    </span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-ink-soft">
                      {s.body}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-sand-deep bg-paper p-6">
            <h2 className="text-xs font-semibold tracking-widest text-forest uppercase">
              Why AfriLynq
            </h2>
            <ul className="mt-4 space-y-3">
              {WHY.map((line) => (
                <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
                  <svg
                    viewBox="0 0 16 16"
                    className="mt-1 h-3.5 w-3.5 shrink-0 text-gold"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3.5 8.5 6.5 11.5 12.5 4.5"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <p className="rounded-xl border-l-2 border-forest bg-forest/5 px-5 py-4 text-sm leading-relaxed text-ink">
            <span className="font-semibold text-forest">
              Nothing is public until verified.
            </span>{" "}
            Your company and your listings stay private to you while we check
            your documents.
          </p>
        </aside>
      </div>
    </section>
  );
}
