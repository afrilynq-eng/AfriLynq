import Link from "next/link";
import { Logo } from "./Logo";

const NAV = [
  { href: "/categories", label: "What we source" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function SiteHeader() {
  return (
    <header className="border-b border-sand-deep bg-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-4 px-6 py-4">
        <Link href="/" aria-label="AfriLynq home">
          <Logo />
        </Link>

        {/* On narrow screens the nav drops to its own row rather than
            competing with the logo and the primary action. */}
        <nav
          className="order-last flex w-full items-center gap-6 border-t border-sand pt-4 text-[0.95rem] sm:order-none sm:w-auto sm:border-0 sm:pt-0"
          aria-label="Main"
        >
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="link-quiet text-ink-soft">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4 text-[0.95rem]">
          <Link href="/contact#supply" className="link-quiet hidden text-ink-soft sm:inline">
            I supply produce
          </Link>
          <Link href="/contact#buy" className="btn-primary !py-2 !px-4">
            I want to buy
          </Link>
        </div>
      </div>
    </header>
  );
}
