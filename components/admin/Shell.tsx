import Link from "next/link";
import Image from "next/image";
import mark from "@/public/brand/mark-reverse.png";
import SignOutButton from "@/app/admin/SignOutButton";

/**
 * Administration shell.
 *
 * A dark, fixed sidebar with the working area to its right, in the same
 * arrangement as the Ova-Sabi platform dashboard. The palette is AfriLynq's
 * own rather than borrowed, so an administrator never has to wonder which
 * system they are looking at.
 */

const NAV = [
  {
    heading: "Platform",
    items: [
      { href: "/admin", label: "Dashboard", icon: "grid" },
      { href: "/admin/leads", label: "All leads", icon: "list" },
    ],
  },
  {
    heading: "Site",
    items: [
      { href: "/", label: "View website", icon: "globe" },
      { href: "/categories", label: "Categories", icon: "tag" },
    ],
  },
];

function Icon({ name }: { name: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6 };
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
      {name === "grid" && (
        <>
          <rect x="2.5" y="2.5" width="6" height="6" rx="1.2" {...common} />
          <rect x="11.5" y="2.5" width="6" height="6" rx="1.2" {...common} />
          <rect x="2.5" y="11.5" width="6" height="6" rx="1.2" {...common} />
          <rect x="11.5" y="11.5" width="6" height="6" rx="1.2" {...common} />
        </>
      )}
      {name === "list" && (
        <>
          <path d="M6.5 5h11M6.5 10h11M6.5 15h11" {...common} strokeLinecap="round" />
          <circle cx="3" cy="5" r="1.1" fill="currentColor" />
          <circle cx="3" cy="10" r="1.1" fill="currentColor" />
          <circle cx="3" cy="15" r="1.1" fill="currentColor" />
        </>
      )}
      {name === "globe" && (
        <>
          <circle cx="10" cy="10" r="7.5" {...common} />
          <ellipse cx="10" cy="10" rx="3.2" ry="7.5" {...common} />
          <path d="M2.7 10h14.6" {...common} />
        </>
      )}
      {name === "tag" && (
        <>
          <path d="M3 3h6.5l7.5 7.5-6.5 6.5L3 9.5V3Z" {...common} strokeLinejoin="round" />
          <circle cx="6.6" cy="6.6" r="1.2" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

export default function AdminShell({
  admin,
  title,
  subtitle,
  children,
}: {
  admin: { email: string; full_name: string | null };
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="admin min-h-screen lg:flex">
      {/* Sidebar */}
      <aside className="shrink-0 border-b border-white/8 bg-[#042115] lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-6 py-6">
          <Image src={mark} alt="" width={242} height={146} className="h-8 w-auto" />
          <div>
            <p className="font-semibold leading-tight text-white">AfriLynq</p>
            <p className="text-[0.7rem] leading-tight text-white/45">
              Administration
            </p>
          </div>
        </div>

        <div className="px-6 pb-5">
          <span className="inline-block rounded bg-gold/15 px-2.5 py-1 text-[0.68rem] font-semibold tracking-wide text-gold uppercase">
            Administrator
          </span>
        </div>

        <nav className="px-3 pb-6" aria-label="Administration">
          {NAV.map((group) => (
            <div key={group.heading} className="mb-5">
              <p className="px-3 pb-2 text-[0.68rem] font-semibold tracking-widest text-white/35 uppercase">
                {group.heading}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.92rem] text-white/70 transition-colors hover:bg-white/6 hover:text-white"
                    >
                      <Icon name={item.icon} />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/8 px-6 py-5 lg:mt-auto">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold font-semibold text-[#042115]">
              {(admin.full_name ?? admin.email).charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm text-white">
                {admin.full_name ?? "Administrator"}
              </p>
              <p className="truncate text-xs text-white/45">{admin.email}</p>
            </div>
          </div>
          <div className="mt-3">
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Working area */}
      <main className="min-w-0 flex-1 bg-[#071B12]">
        <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl !text-white">{title}</h1>
              <p className="mt-1 text-white/50">{subtitle}</p>
            </div>
            <p className="tabular text-sm text-white/40">{today}</p>
          </div>

          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

/** Stat card with a coloured rule across the top, as on the reference. */
export function StatCard({
  value,
  label,
  caption,
  accent = "gold",
}: {
  value: string | number;
  label: string;
  caption?: string;
  accent?: "gold" | "green" | "blue" | "red" | "slate";
}) {
  const colours: Record<string, string> = {
    gold: "#D08D1D",
    green: "#2FA36B",
    blue: "#3B82F6",
    red: "#C2453F",
    slate: "#6B7A72",
  };

  return (
    <div className="overflow-hidden rounded-xl bg-white/[0.04] ring-1 ring-white/8">
      <div className="h-[3px]" style={{ background: colours[accent] }} />
      <div className="px-5 py-5">
        <p className="text-[0.7rem] font-semibold tracking-widest text-white/45 uppercase">
          {label}
        </p>
        <p className="tabular mt-2 text-3xl font-semibold text-white">{value}</p>
        {caption && <p className="mt-1 text-sm text-white/40">{caption}</p>}
      </div>
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white/[0.04] p-5 ring-1 ring-white/8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-3">
        <h2 className="text-[0.72rem] font-semibold tracking-widest !text-white/60 uppercase">
          {title}
        </h2>
        {action}
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}
