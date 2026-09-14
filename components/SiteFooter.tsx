import Link from "next/link";
import { LogoReverse } from "./Logo";
import { SocialIcon, type SocialName } from "./SocialIcon";

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

/**
 * Social accounts.
 *
 * These are the handles AfriLynq is registering under, confirmed by the client
 * on 15 September 2026. An entry with an empty href is not rendered, so a
 * platform can be added later by pasting its address between the quotes, and
 * removed by clearing it.
 */
const SOCIAL: { name: SocialName; label: string; href: string }[] = [
  { name: "facebook", label: "AfriLynq on Facebook", href: "https://facebook.com/afrilynq" },
  { name: "instagram", label: "AfriLynq on Instagram", href: "https://instagram.com/afrilynq" },
  { name: "linkedin", label: "AfriLynq on LinkedIn", href: "https://linkedin.com/company/afrilynq" },
  { name: "x", label: "AfriLynq on X", href: "https://x.com/afrilynq" },
  { name: "youtube", label: "AfriLynq on YouTube", href: "" },
];

export default function SiteFooter() {
  return (
    <footer className="bg-forest-deep text-paper">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <LogoReverse />
          <p className="mt-5 max-w-xs leading-relaxed text-sand-deep">
            Connecting African producers to trusted markets and opportunities
            worldwide.
          </p>

          {SOCIAL.some((s) => s.href) ? (
            <ul className="mt-6 flex gap-3">
              {SOCIAL.filter((s) => s.href).map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-sand-deep/40 text-sand-deep transition-colors hover:border-gold hover:bg-gold hover:text-forest-deep"
                    aria-label={item.label}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <SocialIcon name={item.name} />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
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
