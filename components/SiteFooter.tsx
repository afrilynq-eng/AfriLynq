import Link from "next/link";
import { LogoReverse } from "./Logo";

/**
 * Footer matching the prototype: four columns plus the brand block, on the
 * deep green ground. Contact details are AfriLynq's own, as supplied.
 */
const COMPANY = [
  { href: "/about", label: "About Us" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/about", label: "Why AfriLynq" },
  { href: "/contact", label: "Contact Us" },
];

const MARKETPLACE = [
  { href: "/categories", label: "Product Categories" },
  { href: "/for-farmers", label: "For Farmers" },
  { href: "/for-retailers", label: "For Retailers" },
  { href: "/categories", label: "Browse Products" },
];

const SUPPORT = [
  { href: "/privacy", label: "Privacy Notice" },
  { href: "/cookies", label: "Cookies" },
  { href: "/terms", label: "Terms of Use" },
];

const SOCIAL = [
  { label: "Facebook", href: "https://facebook.com/afrilynq" },
  { label: "Instagram", href: "https://instagram.com/afrilynq" },
  { label: "LinkedIn", href: "https://linkedin.com/company/afrilynq" },
  { label: "X", href: "https://x.com/afrilynq" },
];

export default function SiteFooter() {
  return (
    <footer className="bg-forest-deep text-paper">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <LogoReverse />
          <p className="mt-5 max-w-xs leading-relaxed text-sand-deep">
            Connecting Africa&apos;s agricultural value chain to trusted markets and
            opportunities worldwide.
          </p>

          <ul className="mt-6 flex gap-3">
            {SOCIAL.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-sand-deep/40 text-sm text-sand-deep transition-colors hover:border-gold hover:text-gold"
                  aria-label={item.label}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {item.label.charAt(0)}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gold">Company</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {COMPANY.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="link-quiet text-sand-deep">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gold">Marketplace</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {MARKETPLACE.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="link-quiet text-sand-deep">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gold">Contact us</h2>
          <address className="mt-4 space-y-3 text-sm not-italic leading-relaxed text-sand-deep">
            <p>
              <a href="mailto:info@afrilynq.co.uk" className="link-quiet">
                info@afrilynq.co.uk
              </a>
            </p>
            <p>
              <a href="tel:+447721737556" className="link-quiet">
                +44 7721 737 556
              </a>
            </p>
            <p>
              58 Rockfield Road, Anfield
              <br />
              Liverpool, United Kingdom
            </p>
          </address>

          <h2 className="mt-6 text-sm font-semibold text-gold">Support</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {SUPPORT.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="link-quiet text-sand-deep">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-forest">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-5 text-xs text-stone">
          <p>Copyright {new Date().getFullYear()} AfriLynq. All rights reserved.</p>
          <p>
            AfriLynq introduces buyers and suppliers. It is not a party to any contract
            of sale between them.
          </p>
        </div>
      </div>
    </footer>
  );
}
