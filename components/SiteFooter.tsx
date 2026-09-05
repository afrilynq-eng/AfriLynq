import Link from "next/link";
import { CATEGORIES } from "@/lib/content";
import { LogoReverse } from "./Logo";

export default function SiteFooter() {
  return (
    <footer className="mt-24 bg-forest-deep text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <LogoReverse />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-sand-deep">
            Connecting African harvests to global markets. A sourcing platform linking
            agricultural producers across Africa with buyers in the United Kingdom.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gold">What we source</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {CATEGORIES.slice(0, 5).map((c) => (
              <li key={c.slug}>
                <Link href={`/categories/${c.slug}`} className="link-quiet text-sand-deep">
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/categories" className="link-quiet text-sand-deep">
                All categories
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gold">Company</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/about" className="link-quiet text-sand-deep">About AfriLynq</Link></li>
            <li><Link href="/contact" className="link-quiet text-sand-deep">Contact</Link></li>
            <li><Link href="/privacy" className="link-quiet text-sand-deep">Privacy notice</Link></li>
            <li><Link href="/cookies" className="link-quiet text-sand-deep">Cookies</Link></li>
            <li><Link href="/terms" className="link-quiet text-sand-deep">Terms of use</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gold">Get in touch</h2>
          <address className="mt-4 space-y-2 text-sm not-italic leading-relaxed text-sand-deep">
            <p>
              <a href="mailto:hello@afrilynq.co.uk" className="link-quiet">
                hello@afrilynq.co.uk
              </a>
            </p>
            <p>
              58 Rockfield Road
              <br />
              Anfield, Liverpool
              <br />
              United Kingdom
            </p>
          </address>
        </div>
      </div>

      <div className="border-t border-forest">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5 text-xs text-stone">
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
