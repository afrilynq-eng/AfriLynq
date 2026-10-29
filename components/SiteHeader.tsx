import Link from "next/link";
import { Logo } from "./Logo";
import AccountNav from "./AccountNav";

/**
 * Site header.
 *
 * Everything sits on one line from 1280px up: logo, navigation, language
 * picker and the two account actions. Below that the navigation drops to its
 * own row, which is the only sensible thing to do when it cannot fit.
 *
 * The one-line layout used to start at 1024px, and it did not fit there. Nine
 * nav items, a logo carrying its strapline and two account buttons need about
 * 1327px between them, so every laptop from 1024px to 1365px scrolled
 * sideways. A 1280px MacBook Air was over by 23px.
 *
 * So the single row now waits for 1280px and the nav tightens when it gets
 * there: smaller text and closer gaps, which buys the ~60px that makes 1280
 * fit with room left. Between 1024px and 1279px the nav takes its own row,
 * exactly as it does on a tablet.
 */
const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/for-farmers", label: "For Farmers" },
  { href: "/for-retailers", label: "For Retailers" },
  { href: "/for-shoppers", label: "For Shoppers" },
  { href: "/products", label: "Products" },
];

/**
 * Languages.
 *
 * English is the only one the site is written in. The others are listed so a
 * visitor can see what is coming rather than finding a control that does
 * nothing, and they are marked as such rather than pretending to work.
 */
const LANGUAGES = [
  { code: "EN", label: "English", ready: true },
  { code: "FR", label: "Français", ready: false },
  { code: "PT", label: "Português", ready: false },
  { code: "AR", label: "العربية", ready: false },
  { code: "SW", label: "Kiswahili", ready: false },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-sand-deep bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-6 py-3 xl:flex-nowrap xl:gap-x-3">
        <Link href="/" aria-label="AfriLynq home" className="shrink-0">
          <Logo size="lg" />
        </Link>

        <nav
          className="order-last flex w-full flex-wrap items-center gap-x-4 gap-y-2 border-t border-sand pt-3 text-[0.9rem] font-medium xl:order-none xl:w-auto xl:flex-nowrap xl:gap-x-3.5 xl:border-0 xl:pt-0 xl:text-[0.85rem]"
          aria-label="Main"
        >
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="link-quiet whitespace-nowrap text-ink-soft"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* Native disclosure, so the picker works without any JavaScript. */}
          <details className="relative hidden sm:block">
            <summary className="flex cursor-pointer list-none items-center gap-1 rounded px-2 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-sand">
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                <ellipse cx="10" cy="10" rx="3.4" ry="8" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2.4 10h15.2" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              EN
              <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" aria-hidden="true">
                <path
                  d="M5.5 8l4.5 4.5L14.5 8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </summary>

            <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-sand-deep bg-paper p-1.5 shadow-lg">
              <ul>
                {LANGUAGES.map((lang) => (
                  <li key={lang.code}>
                    {lang.ready ? (
                      <span className="flex items-center justify-between rounded bg-sand px-3 py-2 text-sm font-medium text-forest">
                        {lang.label}
                        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                          <path
                            d="M5 10.5l3 3 7-7.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    ) : (
                      <span className="flex items-center justify-between rounded px-3 py-2 text-sm text-stone">
                        {lang.label}
                        <span className="text-[0.68rem] tracking-wide uppercase">
                          Coming
                        </span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="border-t border-sand px-3 pt-2.5 pb-1.5 text-xs leading-relaxed text-stone">
                The site is in English today. Tell us which language your buyers
                use and we will prioritise it.
              </p>
            </div>
          </details>

          {/* Sign In and Sign Up when signed out, your name and a menu when
              signed in. Kept in its own client component so the header, and
              every static page under it, can stay server rendered. */}
          <AccountNav />
        </div>
      </div>
    </header>
  );
}
