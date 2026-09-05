import type { ReactNode } from "react";

/**
 * Shared shell for the privacy, cookie and terms pages.
 *
 * These pages exist to be read and to be found, so they are plain server
 * rendered prose on a narrow measure with a visible last-updated date. No
 * accordions, no tabs. A regulator or a buyer's legal team should be able to
 * read the whole thing in one scroll and print it.
 */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-6 pt-16 pb-8">
      <h1 className="text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-4 text-sm text-stone">Last updated {updated}</p>
      <p className="mt-7 text-lg leading-relaxed text-ink-soft">{intro}</p>
      <div className="mt-10 space-y-10">{children}</div>
    </article>
  );
}

export function Section({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl sm:text-2xl">{heading}</h2>
      <div className="mt-4 space-y-4 leading-relaxed text-ink-soft [&_a]:underline [&_li]:leading-relaxed">
        {children}
      </div>
    </section>
  );
}

/**
 * Marks a decision AfriLynq has to make before launch. Deliberately visible
 * rather than a code comment: an unfinished legal page that looks finished is
 * worse than one that says so.
 */
export function ToConfirm({ children }: { children: ReactNode }) {
  return (
    <p className="border-l-2 border-gold bg-sand px-4 py-3 text-sm">
      <strong className="text-forest">To confirm before launch: </strong>
      {children}
    </p>
  );
}
