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
 * Steps and badge counts are worked out on the server and passed in, so this
 * stays a dumb component and the rules about what counts as done live in one
 * place.
 */

export interface PortalStep {
  label: string;
  done: boolean;
  /** The step the person should act on now. At most one is true. */
  current: boolean;
}

/** Badge numbers, keyed by the link they belong to. Zero hides the badge. */
export type PortalCounts = Partial<Record<string, number>>;

interface Props {
  name: string;
  email: string | null;
  companyLine: string | null;
  isAdmin: boolean;
  hasCompany: boolean;
  steps: PortalStep[];
  counts: PortalCounts;
  children: React.ReactNode;
}

const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinejoin: "round" as const };

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" aria-hidden="true">
      {name === "home" && <path d="M3 8.6 10 3.2l7 5.4V16a1 1 0 0 1-1 1h-3.6v-4.4H7.6V17H4a1 1 0 0 1-1-1Z" {...s} />}
      {name === "building" && (
        <>
          <path d="M4 17V4.6a.6.6 0 0 1 .6-.6h7.3a.6.6 0 0 1 .6.6V17" {...s} />
          <path d="M12.5 8.4H16a.6.6 0 0 1 .6.6V17M2.6 17h14.8M6.6 7.4h3.2M6.6 10.4h3.2M6.6 13.4h3.2" {...s} strokeLinecap="round" />
        </>
      )}
      {name === "box" && (
        <>
          <path d="M10 2.9 17 6.4v7.2L10 17.1 3 13.6V6.4Z" {...s} />
          <path d="M3 6.4 10 10l7-3.6M10 10v7.1" {...s} />
        </>
      )}
      {name === "inbox" && (
        <>
          <path d="M3 10.6 5 4.4h10l2 6.2V15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" {...s} />
          <path d="M3 10.6h3.6a.6.6 0 0 1 .6.5 2.8 2.8 0 0 0 5.6 0 .6.6 0 0 1 .6-.5H17" {...s} />
        </>
      )}
      {name === "chat" && <path d="M3.4 14.2V5.6a1 1 0 0 1 1-1h11.2a1 1 0 0 1 1 1v6.8a1 1 0 0 1-1 1H7Z" {...s} />}
      {name === "chart" && (
        <path d="M3.4 16.6h13.2M6 13.6V9M10 13.6V4.4M14 13.6v-5" {...s} strokeLinecap="round" />
      )}
      {name === "doc" && (
        <>
          <path d="M5 3.4h6.2L15 7.2V16a.6.6 0 0 1-.6.6H5a.6.6 0 0 1-.6-.6V4a.6.6 0 0 1 .6-.6Z" {...s} />
          <path d="M11 3.6v4h4" {...s} />
        </>
      )}
      {name === "bolt" && <path d="M11.2 2.6 4.6 11h4.2l-.8 6.4L15.4 9h-4.2Z" {...s} />}
      {name === "sliders" && (
        <path d="M3.4 6.4h3.2M9.8 6.4h6.8M3.4 13.6h6.8M13.8 13.6h2.8M8.2 4.6v3.6M12.4 11.8v3.6" {...s} strokeLinecap="round" />
      )}
    </svg>
  );
}

type Entry = {
  href: string;
  label: string;
  icon: string;
  needsCompany: boolean;
  /** Designed, scheduled, not built. Shown so the shape does not change later. */
  soon?: boolean;
};

const LINKS: Entry[] = [
  { href: "/account", label: "Overview", icon: "home", needsCompany: false },
  { href: "/account/company", label: "Company profile", icon: "building", needsCompany: true },
  { href: "/account/products", label: "Listings", icon: "box", needsCompany: true },
  { href: "/account/enquiries", label: "Enquiries", icon: "inbox", needsCompany: true },
  { href: "/account/messages", label: "Messages", icon: "chat", needsCompany: true, soon: true },
  { href: "/account/performance", label: "Performance", icon: "chart", needsCompany: true, soon: true },
  { href: "/account/documents", label: "Documents and verification", icon: "doc", needsCompany: true },
  { href: "/account/promote", label: "Promote", icon: "bolt", needsCompany: true, soon: true },
  { href: "/account/settings", label: "Settings", icon: "sliders", needsCompany: false },
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

function Badge({ n, muted }: { n: number; muted?: boolean }) {
  return (
    <span
      className={
        "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.68rem] font-semibold " +
        (muted ? "bg-paper/20 text-paper" : "bg-gold text-forest-deep")
      }
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

export default function PortalShell({
  name,
  email,
  companyLine,
  isAdmin,
  hasCompany,
  steps,
  counts,
  children,
}: Props) {
  const pathname = usePathname();

  return (
    // A flat ground for the whole portal. The public pages sit on the
    // photographic backdrop, which is right for them and wrong behind a
    // dashboard: white cards over a photograph are hard to read and the
    // numbers stop being the thing you see first.
    <div className="bg-sand">
      {/* ---------- Who you are, and how far along ---------- */}
      <section className="border-b border-sand-deep bg-sand">
        <div className="mx-auto max-w-6xl px-6 pt-10 pb-8">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <h1 className="text-3xl sm:text-4xl">Welcome, {name}</h1>
              {email && (
                <p className="mt-2 text-sm text-ink-soft">
                  Signed in as {email}
                  {companyLine && <> &middot; {companyLine}</>}
                </p>
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
        <nav aria-label="Your account" className="mb-8 shrink-0 lg:mb-0 lg:w-60">
          <ul className="flex gap-1 overflow-x-auto border-b border-sand-deep pb-2 lg:block lg:space-y-0.5 lg:overflow-visible lg:border-0 lg:pb-0">
            {LINKS.map((link) => {
              const active =
                link.href === "/account"
                  ? pathname === "/account"
                  : pathname.startsWith(link.href);

              // Nothing to profile or upload against until a company exists,
              // and three of these are designed but not built yet. Both are
              // shown and explained rather than hidden, so the sidebar does
              // not change shape underneath people as they go.
              const locked = (link.needsCompany && !hasCompany) || link.soon;
              const n = counts[link.href] ?? 0;

              if (locked) {
                return (
                  <li key={link.href}>
                    <span
                      className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm whitespace-nowrap text-stone"
                      title={link.soon ? "Arriving in Stage 3" : "Create your company first"}
                    >
                      <Icon name={link.icon} />
                      {link.label}
                      {link.soon && (
                        <span className="ml-auto rounded-full bg-sand-deep px-2 py-0.5 text-[0.62rem] font-semibold tracking-wide text-stone uppercase">
                          Soon
                        </span>
                      )}
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
                      "flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm whitespace-nowrap transition-colors " +
                      (active
                        ? "bg-forest font-medium text-paper"
                        : "text-ink-soft hover:bg-sand hover:text-forest")
                    }
                  >
                    <Icon name={link.icon} />
                    {link.label}
                    {n > 0 && <Badge n={n} muted={active} />}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 hidden rounded-xl border border-sand-deep bg-sand/60 p-5 lg:block">
            <p className="font-semibold text-forest">Need a hand?</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              Email{" "}
              <a href="mailto:info@afrilynq.co.uk" className="link-quiet text-forest">
                info@afrilynq.co.uk
              </a>{" "}
              and a person will answer, usually the same working day.
            </p>
          </div>
        </nav>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
