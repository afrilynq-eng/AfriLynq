import Link from "next/link";
import { Logo } from "./Logo";

/**
 * Header matching the AfriLynq prototype: full navigation on the left, a
 * language marker, an outlined secondary action and a filled primary action.
 *
 * Every link resolves to a page that exists. The prototype's "Resources" menu
 * has no pages behind it yet, so it is left out rather than shipped as a dead
 * link.
 */
const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/contact#supply", label: "For Farmers" },
  { href: "/contact#buy", label: "For Retailers" },
  { href: "/categories", label: "Products" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-sand-deep bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-4 px-6 py-3.5">
        <Link href="/" aria-label="AfriLynq home" className="shrink-0">
          <Logo />
        </Link>

        <nav
          className="order-last flex w-full flex-wrap items-center gap-x-6 gap-y-2 border-t border-sand pt-3.5 text-[0.95rem] lg:order-none lg:w-auto lg:border-0 lg:pt-0"
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

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <span
            className="hidden items-center gap-1.5 text-sm text-stone sm:flex"
            aria-label="Language: English"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4" />
              <ellipse cx="10" cy="10" rx="3.4" ry="8" stroke="currentColor" strokeWidth="1.4" />
              <path d="M2.4 10h15.2" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            EN
          </span>

          <Link
            href="/contact"
            className="hidden rounded border border-forest px-4 py-2 text-[0.95rem] text-forest transition-colors hover:bg-forest hover:text-paper sm:inline-block"
          >
            Contact
          </Link>

          <Link
            href="/contact#buy"
            className="rounded bg-forest px-5 py-2 text-[0.95rem] text-paper transition-colors hover:bg-gold hover:text-forest-deep"
          >
            Join Now
          </Link>
        </div>
      </div>
    </header>
  );
}
