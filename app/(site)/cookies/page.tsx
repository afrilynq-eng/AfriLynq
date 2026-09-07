import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, ToConfirm } from "@/components/Legal";
import CookieSettingsButton from "@/components/CookieSettingsButton";

export const metadata: Metadata = {
  title: "Cookie notice",
  description:
    "What cookies AfriLynq uses, what each one does, and how to change your choices at any time.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie notice"
      updated="5 September 2026"
      intro="Cookies are small files a website stores on your device. This notice lists the ones we use, what each is for, and how to change your mind."
    >
      <Section heading="Your current choice">
        <p>
          You can change your cookie choices whenever you like. Nothing that
          needs your consent is loaded until you give it.
        </p>
        <CookieSettingsButton />
      </Section>

      <Section heading="Strictly necessary cookies">
        <p>
          These make the site work and cannot be switched off. They do not track
          you and we do not need your consent for them.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead>
              <tr className="border-b border-sand-deep text-stone">
                <th scope="col" className="py-2 pr-6 font-medium">Name</th>
                <th scope="col" className="py-2 pr-6 font-medium">Purpose</th>
                <th scope="col" className="py-2 font-medium">Expires</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-sand">
                <td className="py-3 pr-6">afrilynq_consent</td>
                <td className="py-3 pr-6">
                  Remembers whether you accepted or declined analytics cookies,
                  so we do not ask again on every page.
                </td>
                <td className="py-3">6 months</td>
              </tr>
              <tr className="border-b border-sand">
                <td className="py-3 pr-6">sb-access-token</td>
                <td className="py-3 pr-6">
                  Keeps you signed in to the administration area. Only set if you
                  have an account and sign in.
                </td>
                <td className="py-3">Session</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section heading="Analytics cookies">
        <p>
          These help us understand which pages people find useful and where they
          give up. They are only set if you accept them, and declining them
          changes nothing about how the site works for you.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead>
              <tr className="border-b border-sand-deep text-stone">
                <th scope="col" className="py-2 pr-6 font-medium">Name</th>
                <th scope="col" className="py-2 pr-6 font-medium">Provider</th>
                <th scope="col" className="py-2 font-medium">Expires</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-sand">
                <td className="py-3 pr-6">_ga</td>
                <td className="py-3 pr-6">Google Analytics</td>
                <td className="py-3">2 years</td>
              </tr>
              <tr className="border-b border-sand">
                <td className="py-3 pr-6">_ga_&lt;id&gt;</td>
                <td className="py-3 pr-6">Google Analytics</td>
                <td className="py-3">2 years</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ToConfirm>
          Whether Google Analytics is the right choice for a United Kingdom site.
          A privacy focused alternative that sets no cookies at all would remove
          the need for a consent banner entirely, and is usually cheaper to
          defend than to explain.
        </ToConfirm>
      </Section>

      <Section heading="Cookies we do not use">
        <p>
          We do not use advertising cookies, social media tracking pixels or
          cross site profiling. We do not share analytics data with advertisers.
        </p>
      </Section>

      <Section heading="Managing cookies in your browser">
        <p>
          You can also block or delete cookies in your browser settings. Doing so
          may affect how this and other sites behave. Your browser&apos;s help
          pages explain how.
        </p>
        <p>
          For what we do with the information itself, see our{" "}
          <Link href="/privacy">privacy notice</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
