import Link from "next/link";
import { Logo } from "./Logo";

/**
 * Site header.
 *
 * Everything sits on one line from 1024px up: logo, navigation, language
 * picker and the two account actions. Below that the navigation drops to its
 * own row, which is the only sensible thing to do on a narrow screen.
 *
 * The strapline stays under the wordmark. It is the widest part of the lockup,
 * so the room for it comes from the navigation and the actions instead:
 * smaller nav text, tighter gaps, shorter buttons and a compact language
 * picker. lg:flex-nowrap then stops the row breaking at all above 1024px.
 */
const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/marketplace", label: "Marketplace" },
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
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-3 px-6 py-3 lg:flex-nowrap">
        <Link href="/" aria-label="AfriLynq home" className="shrink-0">
          <Logo size="lg" />
        </Link>

        <nav
          className="order-last flex w-full flex-wrap items-center gap-x-4 gap-y-2 border-t border-sand pt-3 text-[0.9rem] font-medium lg:order-none lg:w-auto lg:flex-nowrap lg:border-0 lg:pt-0"
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

          <Link
            href="/marketplace"
            className="btn-lift hidden rounded border border-forest px-3.5 py-1.5 text-[0.9rem] font-medium text-forest transition-colors hover:bg-forest hover:text-paper sm:inline-block"
          >
            Sign In
          </Link>

          <Link
            href="/contact"
            className="btn-lift rounded bg-forest px-4 py-1.5 text-[0.9rem] font-medium text-paper transition-colors hover:bg-gold hover:text-forest-deep"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  );
}
