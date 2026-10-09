"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The frame every signed in page sits inside.
 *
 * Two jobs. The sidebar gives the account somewhere to go, which the single
 * card it replaced did not. The progress strip says where you are, because
 * the complaint about the old page was not that it was ugly but that it
 * stopped: you created a company and then nothing told you what happened
 * next or who was waiting on whom.
 *
 * Steps are worked out on the server and passed in, so this stays a dumb
 * component and the rules about what counts as done live in one place.
 */

export interface PortalStep {
  label: string;
  done: boolean;
  /** The step the person should act on now. At most one is true. */
  current: boolean;
}

interface Props {
  name: string;
  email: string | null;
  isAdmin: boolean;
  hasCompany: boolean;
  steps: PortalStep[];
  children: React.ReactNode;
}

// Company profile editing arrives with the next set of pages. It is left out
// rather than shown greyed, because a link that is permanently disabled
// teaches people to stop reading the sidebar.
const LINKS = [
  { href: "/account", label: "Overview", needsCompany: false },
  { href: "/account/documents", label: "Documents and verification", needsCompany: true },
  { href: "/account/settings", label: "Settings", needsCompany: false },
];

function Tick() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PortalShell({
  name,
  email,
  isAdmin,
  hasCompany,
  steps,
  children,
}: Props) {
  const pathname = usePathname();

  return (
    <>
      {/* ---------- Who you are, and how far along ---------- */}
      <section className="border-b border-sand-deep bg-sand">
        <div className="mx-auto max-w-6xl px-6 pt-10 pb-8">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <h1 className="text-3xl sm:text-4xl">Welcome, {name}</h1>
              {email && (
                <p className="mt-2 text-sm text-ink-soft">Signed in as {email}</p>
              )}
            </div>
            {isAdmin && (
              <Link href="/admin" className="link-quiet text-sm text-forest">
                Go to administration &rarr;
              </Link>
            )}
          </div>

          {/* The strip scrolls sideways on a phone rather than wrapping into
              an unreadable stack of five rows. */}
          <ol className="mt-8 flex gap-1 overflow-x-auto pb-1">
            {steps.map((step, i) => (
              <li
                key={step.label}
                className="flex min-w-[8.5rem] flex-1 flex-col gap-2"
              >
                <div className="flex items-center gap-1">
                  <span
                    className={
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-semibold " +
                      (step.done
                        ? "bg-forest text-paper"
                        : step.current
                          ? "bg-gold text-forest-deep"
                          : "bg-sand-deep text-stone")
                    }
                  >
                    {step.done ? <Tick /> : i + 1}
                  </span>
                  {i < steps.length - 1 && (
                    <span
                      className={
                        "h-0.5 flex-1 rounded " +
                        (step.done ? "bg-forest/40" : "bg-sand-deep")
                      }
                    />
                  )}
                </div>
                <span
                  className={
                    "pr-3 text-xs leading-snug " +
                    (step.current
                      ? "font-semibold text-forest"
                      : step.done
                        ? "text-ink-soft"
                        : "text-stone")
                  }
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Sidebar and page ---------- */}
      <div className="mx-auto max-w-6xl gap-10 px-6 py-10 lg:flex">
        <nav
          aria-label="Your account"
          className="mb-8 shrink-0 lg:mb-0 lg:w-56"
        >
          <ul className="flex gap-1 overflow-x-auto border-b border-sand-deep pb-2 lg:block lg:space-y-1 lg:overflow-visible lg:border-0 lg:pb-0">
            {LINKS.map((link) => {
              const active =
                link.href === "/account"
                  ? pathname === "/account"
                  : pathname.startsWith(link.href);

              // Nothing to profile or upload against until a company exists.
              // Shown and explained rather than hidden, so the sidebar does
              // not change shape underneath people as they go.
              const locked = link.needsCompany && !hasCompany;

              if (locked) {
                return (
                  <li key={link.href}>
                    <span
                      className="block cursor-not-allowed rounded-lg px-3.5 py-2.5 text-sm whitespace-nowrap text-stone"
                      title="Create your company first"
                    >
                      {link.label}
                    </span>
                  </li>
                );
              }

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      "block rounded-lg px-3.5 py-2.5 text-sm whitespace-nowrap transition-colors " +
                      (active
                        ? "bg-forest font-medium text-paper"
                        : "text-ink-soft hover:bg-sand hover:text-forest")
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
