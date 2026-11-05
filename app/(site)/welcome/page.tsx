import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser, userCompanies, greetingName } from "@/lib/supabase-server";
import { chooseRole } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Welcome to AfriLynq",
  robots: { index: false, follow: false },
};

/**
 * The question the sign-up forms ask and a social sign-in cannot.
 *
 * Registering through one of the three forms tells us whether somebody
 * is a farm, a retailer or a shopper, and the whole portal is shaped by
 * that answer. Google and Microsoft return a name and an email address
 * and nothing else, so an account created that way arrives with no
 * answer at all.
 *
 * Without this page, account_type stays null, the portal falls through
 * to its last case, and a shopper who signed in with Google is shown a
 * supplier's screen and told to register a business. That is the same
 * dead end we closed for shoppers in October, reopened by a different
 * door, and it would have appeared the day the social buttons were
 * switched on.
 *
 * Shown to anyone signed in who has no account_type AND no company.
 * Having a company is itself an answer, so those people never see it.
 */

const OPTIONS = [
  {
    value: "supplier",
    title: "I grow or export produce",
    body: "You list what you supply and receive enquiries from UK and European buyers. You will add your farm or company next.",
  },
  {
    value: "buyer",
    title: "I buy produce for a business",
    body: "A retailer, wholesaler, restaurant or processor. You post what you need and receive quotes. You will add your company next.",
  },
  {
    value: "shopper",
    title: "I am buying for myself",
    body: "Smaller quantities from a retailer near you. No company needed, and nothing further to set up.",
  },
];

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Already answered, or has a company, which answers it. Nothing to do.
  const companies = await userCompanies();
  if (user.account_type || companies.length > 0) redirect("/account");

  const name = greetingName(user);

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl sm:text-5xl">
        {name && name !== "there" ? `Welcome, ${name}` : "Welcome"}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
        One question before we take you in, so we show you the right thing.
        What brings you to AfriLynq?
      </p>

      {error === "pick" && (
        <p className="mt-6 rounded-lg border-l-2 border-gold bg-sand px-4 py-3 text-ink">
          Please choose one of the three.
        </p>
      )}
      {error === "save" && (
        <p className="mt-6 rounded-lg border-l-2 border-gold bg-sand px-4 py-3 text-ink">
          We could not save that. Please try again, and tell us at
          info@afrilynq.co.uk if it keeps happening.
        </p>
      )}

      <form action={chooseRole} className="mt-8">
        <fieldset>
          <legend className="sr-only">What brings you to AfriLynq</legend>
          <div className="space-y-3">
            {OPTIONS.map((o, i) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-start gap-4 rounded-xl border border-sand-deep bg-paper p-5 transition-colors hover:border-gold has-[:checked]:border-forest has-[:checked]:bg-sand/60"
              >
                <input
                  type="radio"
                  name="accountType"
                  value={o.value}
                  defaultChecked={i === 0}
                  className="mt-1 accent-[var(--color-forest)]"
                />
                <span>
                  <span className="block font-semibold text-ink">{o.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
                    {o.body}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" className="btn-lift btn-primary mt-8">
          Continue
        </button>
      </form>

      <p className="mt-6 text-sm text-stone">
        Not sure? Pick the closest. Tell us at info@afrilynq.co.uk if you need
        it changed later.
      </p>
    </section>
  );
}
