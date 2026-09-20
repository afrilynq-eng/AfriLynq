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
  { href: "/register/shopper", label: "For Shoppers" },
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
  { name: "facebook", label: "AfriLynq on Facebook", href: "https://www.facebook.com/share/1FELz8vn4Z/" },
  { name: "instagram", label: "AfriLynq on Instagram", href: "https://www.instagram.com/afrilynqlimited" },
  { name: "linkedin", label: "AfriLynq on LinkedIn", href: "https://linkedin.com/company/afrilynq" },
  { name: "x", label: "AfriLynq on X", href: "https://x.com/afrilynq" },
  { name: "tiktok", label: "AfriLynq on TikTok", href: "https://www.tiktok.com/@afrilynqlimited" },
  { name: "youtube", label: "AfriLynq on YouTube", href: "" },
];

export default function SiteFooter() {
  return (
    <footer className="relative isolate overflow-hidden bg-forest-deep text-paper">
      {/* Field rows fading up out of the dark ground, so the footer carries the
          same landscape as the rest of the site rather than a flat block. */}
      <div className="absolute inset-0" aria-hidden="true">
        <svg
          viewBox="0 0 1600 420"
          preserveAspectRatio="xMidYMax slice"
          className="h-full w-full"
        >
          <defs>
            <linearGradient id="footer-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#04281A" stopOpacity="1" />
              <stop offset="55%" stopColor="#04281A" stopOpacity="0.72" />
              <stop offset="100%" stopColor="#04281A" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          <g stroke="#1B5E3A" strokeWidth="2" fill="none" opacity="0.55">
            {Array.from({ length: 21 }, (_, i) => (
              <path key={i} d={`M800 40 L ${-600 + i * 140} 440`} />
            ))}
          </g>
          <g stroke="#D08D1D" strokeWidth="1.2" fill="none" opacity="0.16">
            {[70, 130, 210, 310].map((y, i) => (
              <ellipse key={i} cx="800" cy={40 + y} rx={700 + y * 3} ry={y * 0.5} />
            ))}
          </g>
          <rect width="1600" height="420" fill="url(#footer-fade)" />
        </svg>
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-5">
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
              {/* Nigerian line is the client's WhatsApp, so it opens there
                  rather than dialling. */}
              <a
                href="https://wa.me/2347043085338"
                className="link-quiet"
                rel="noopener noreferrer"
                target="_blank"
              >
                +234 704 308 5338
                <span className="ml-1.5 text-xs text-stone">WhatsApp</span>
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

      <div className="relative border-t border-forest/70 bg-forest-deep/60">
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
