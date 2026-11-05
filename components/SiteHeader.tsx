import Link from "next/link";
import { Logo } from "./Logo";
import AccountNav from "./AccountNav";
import NavMenu, { type NavMenuItem } from "./NavMenu";

/**
 * Site header.
 *
 * Everything sits on one line from 1024px up: logo, navigation, language
 * picker and the two account actions. Below that the navigation drops to its
 * own row, which is the only sensible thing to do when it cannot fit.
 *
 * This breakpoint has moved twice. It started at 1024px and did not fit:
 * nine nav items, a logo carrying its strapline and two account buttons
 * needed about 1327px between them, so every laptop from 1024px to 1365px
 * scrolled sideways, and a 1280px MacBook Air was over by 23px. The fix at
 * the time was to push the single row out to 1280px.
 *
 * Cutting the nav to four items removed the reason for that. Measured at
 * twelve widths from 320px to 1600px, nothing overflows at 1024px any more,
 * so the single row has come back to where it belongs and the laptops in
 * between get a tidy header rather than a stacked one.
 *
 *
 * Nine items became five
 * ----------------------
 * The nav carried nine links, which is more than a first time visitor can
 * read, let alone choose between. Collins could not navigate the site, and
 * this was the first reason why.
 *
 *   Home          the logo already goes home, and every site works this way
 *   Suppliers     suppliers are in the marketplace, which is where somebody
 *                 looking for one goes
 *   For Farmers   three links for three audiences, where a visitor is only
 *   For Retailers ever one of the three. Grouped under one heading, which
 *   For Shoppers  also gives room to say what each page is for.
 *
 * Products stays, under a name that says what it is. It and the
 * marketplace are two different things that look alike: one is the
 * reference list of everything AfriLynq can source, the other is what
 * suppliers are offering today. Hiding one of them did not separate them,
 * it just made the catalogue hard to find. So both are on the nav, named
 * so the difference is readable, and each page opens by saying which it
 * is and linking to the other.
 *
 * What is left is five: the two things to look at, who it is for, how it
 * works, and who we are.
 */
const NAV = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/products", label: "What we source" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
];

/**
 * The grouped audience pages.
 *
 * "Who it's for" rather than "Join as": these are explainer pages, not
 * registration, and a visitor who clicks a thing called "Join as" and
 * lands on a page of prose has been misled. The hints matter more than
 * they look; they are what tells a shopper they are in the right place
 * on a site whose front page talks about container loads.
 */
const AUDIENCES: NavMenuItem[] = [
  {
    href: "/for-farmers",
    label: "Farmers and producers",
    hint: "Sell to verified UK and European buyers",
  },
  {
    href: "/for-retailers",
    label: "Retailers and wholesalers",
    hint: "Source by the pallet or the container",
  },
  {
    href: "/for-shoppers",
    label: "Shoppers",
    hint: "Buy smaller quantities from a retailer near you",
  },
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
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-6 py-3 lg:flex-nowrap lg:gap-x-3">
        <Link href="/" aria-label="AfriLynq home" className="shrink-0">
          <Logo size="xl" />
        </Link>

        <nav
          className="order-last flex w-full flex-wrap items-center gap-x-4 gap-y-2 border-t border-sand pt-3 text-[0.9rem] font-medium lg:order-none lg:w-auto lg:flex-nowrap lg:gap-x-3.5 lg:border-0 lg:pt-0 lg:text-[0.85rem]"
          aria-label="Main"
        >
          {/* The two browsing destinations first, then who the site is
              for, then the explainers. */}
          {NAV.slice(0, 2).map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="link-quiet whitespace-nowrap text-ink-soft"
            >
              {item.label}
            </Link>
          ))}

          <NavMenu title="Who it's for" items={AUDIENCES} />

          {NAV.slice(2).map((item) => (
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
