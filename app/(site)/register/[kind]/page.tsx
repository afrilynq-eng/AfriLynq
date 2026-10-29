import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase-server";
import { catalogueLabels } from "@/lib/catalogue";
import { authErrorMessage } from "@/lib/auth-errors";
import RoleSignUpForm, { type Kind } from "@/components/auth/RoleSignUpForm";
import AuthSteps from "@/components/auth/AuthSteps";

export const dynamic = "force-dynamic";

/**
 * Join as a farmer, a retailer or a shopper.
 *
 * These three used to be lead forms: a name and an email into the leads
 * table, with somebody chasing by hand afterwards because accounts did
 * not exist yet. They now create real accounts, the same as /sign-up,
 * but each asks only what concerns that audience.
 *
 * /sign-up keeps its four role cards and stays the general door for
 * anyone who arrives without having chosen.
 */

const PAGES: Record<
  Kind,
  { title: string; lede: string; next: string[]; why: string[]; back: { href: string; label: string } }
> = {
  farmer: {
    title: "Join as a farmer or exporter",
    lede: "Free to join. Tell us what you supply and we will put it in front of UK buyers.",
    next: [
      "Confirm your email with a 6-digit code.",
      "Add your farm or business and upload your registration.",
      "We verify you, usually within two working days.",
    ],
    why: [
      "Buyers see verified suppliers only, so your documents are what win you the enquiry.",
      "Set your own prices and decide which of them are public.",
      "Enquiries come straight to you. No commission on what you agree.",
      "Free to join and free to list.",
    ],
    back: { href: "/for-farmers", label: "For farmers" },
  },
  retailer: {
    title: "Join as a retailer",
    lede: "Free to join. Tell us what you source and we will show you suppliers who have been checked.",
    next: [
      "Confirm your email with a 6-digit code.",
      "Add your company so suppliers know who is asking.",
      "Send your first request and compare what comes back.",
    ],
    why: [
      "Every supplier is verified before they can be listed, with documents on file.",
      "Ask one supplier or several, with the same specification.",
      "Prices and terms come from the supplier directly, not through a middleman.",
      "Free to join and free to request.",
    ],
    back: { href: "/for-retailers", label: "For retailers" },
  },
  shopper: {
    title: "Join as a shopper",
    lede: "Buying for yourself rather than to resell. No company needed, no minimum order.",
    next: [
      "Confirm your email with a 6-digit code.",
      "Tell us what you are looking for.",
      "Browse verified suppliers and ask them directly.",
    ],
    why: [
      "Every supplier on AfriLynq has had their documents checked.",
      "Buy in the quantities a household actually uses.",
      "No company registration and no minimum order.",
      "Free to join.",
    ],
    back: { href: "/for-shoppers", label: "For shoppers" },
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((kind) => ({ kind }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kind: string }>;
}): Promise<Metadata> {
  const { kind } = await params;
  const entry = PAGES[kind as Kind];
  if (!entry) return { title: "Not found" };
  return {
    title: entry.title,
    description: entry.lede,
    alternates: { canonical: `/register/${kind}` },
    robots: { index: true, follow: true },
  };
}

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { kind } = await params;
  const entry = PAGES[kind as Kind];
  if (!entry) notFound();

  const [{ error }, user, labels] = await Promise.all([
    searchParams,
    currentUser(),
    // A public page must not fail to render because a reference query did.
    // Without categories the form simply does not ask that question.
    catalogueLabels().catch(() => ({ categories: [], units: [] })),
  ]);

  // Somebody already signed in has nothing to do here.
  if (user) redirect("/account");

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <Link href={entry.back.href} className="link-quiet text-sm text-ink-soft">
        &larr; {entry.back.label}
      </Link>

      <div className="mx-auto mt-6 max-w-2xl text-center">
        <h1 className="text-3xl font-semibold text-forest sm:text-4xl">{entry.title}</h1>
        <p className="mt-3 text-ink-soft">{entry.lede}</p>
      </div>

      <div className="mt-9">
        <AuthSteps current={1} />
      </div>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <RoleSignUpForm
          kind={kind as Kind}
          categories={labels.categories}
          initialError={authErrorMessage(error)}
        />

        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="rounded-xl border border-sand-deep bg-sand/50 p-6">
            <h2 className="text-xs font-semibold tracking-widest text-forest uppercase">
              What happens next
            </h2>
            <ol className="mt-4 space-y-4">
              {entry.next.map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-semibold text-paper">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-ink-soft">{s}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-sand-deep bg-paper p-6">
            <h2 className="text-xs font-semibold tracking-widest text-forest uppercase">
              Why AfriLynq
            </h2>
            <ul className="mt-4 space-y-3">
              {entry.why.map((line) => (
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
            <span className="font-semibold text-forest">Not what you are?</span>{" "}
            <Link href="/sign-up" className="link-quiet text-forest">
              Start from the general sign-up
            </Link>{" "}
            and pick from all four.
          </p>
        </aside>
      </div>
    </section>
  );
}
