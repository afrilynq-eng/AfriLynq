import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/Legal";
import CookieSettingsButton from "@/components/CookieSettingsButton";

export const metadata: Metadata = {
  title: "Cookie policy",
  description:
    "How AfriLynq Limited uses cookies and similar technologies, the categories used, and how to change your preferences.",
  alternates: { canonical: "/cookies" },
};

/**
 * Cookie policy.
 *
 * AfriLynq's own text, supplied by the client on 14 September 2026. One
 * departure from the supplied wording: the consent section describes the
 * controls the site actually has, accept and decline, rather than a three
 * option control that is not built. A policy describing controls that do not
 * exist is worse than no policy.
 */
export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie policy"
      updated="September 2026"
      intro="This cookie policy explains how AfriLynq Limited may use cookies and similar technologies when you visit or use the AfriLynq website."
    >
      <Section heading="1. What are cookies">
        <p>
          Cookies are small files or similar technologies that may be stored on
          your device when you visit our website. They can help websites
          operate, remember preferences, improve performance and understand how
          visitors use the website.
        </p>
      </Section>

      <Section heading="2. How AfriLynq uses cookies">
        <ul className="list-disc space-y-2 pl-5">
          <li>Website security.</li>
          <li>Account login and authentication.</li>
          <li>Remembering preferences.</li>
          <li>Maintaining website and marketplace functionality.</li>
          <li>Analysing website performance.</li>
          <li>Understanding how users interact with our website.</li>
          <li>Improving our services.</li>
        </ul>
      </Section>

      <Section heading="3. Types of cookies">
        <p>
          <strong>Strictly necessary cookies.</strong> These are necessary for
          requested website functions such as login, security, session
          management and marketplace functionality.
        </p>
        <p>
          <strong>Preference cookies.</strong> These remember choices such as
          language and other settings.
        </p>
        <p>
          <strong>Analytics cookies.</strong> These may help us understand which
          pages are visited and how the website performs.
        </p>
        <p>
          <strong>Marketing cookies.</strong> If used, these may help us
          understand advertising activity or deliver more relevant marketing.
          They are not activated until appropriate consent has been obtained
          where required.
        </p>
      </Section>

      <Section heading="4. Third party cookies">
        <p>
          Some services used by AfriLynq may place cookies or use similar
          technologies, including services for payment processing, analytics,
          security, communications, embedded content, marketing and other
          website functionality.
        </p>
        <p>
          The website currently uses Google Analytics to understand how the site
          is used. It is not loaded at all unless you accept analytics cookies.
        </p>
      </Section>

      <Section heading="5. Cookie consent">
        <p>
          Where consent is legally required, non essential cookies are not
          activated until you provide consent.
        </p>
        <p>
          The banner shown on your first visit offers two choices which carry
          equal weight: accept analytics, or decline. Declining changes nothing
          about how the website works for you.
        </p>
      </Section>

      <Section heading="6. Changing your preferences">
        <p>
          You can change your cookie preferences at any time using the button
          below. You can also manage cookies through your browser.
        </p>
        <p>
          <CookieSettingsButton />
        </p>
      </Section>

      <Section heading="7. Changes to this cookie policy">
        <p>
          We may update this cookie policy when our website, technology or legal
          requirements change.
        </p>
      </Section>

      <Section heading="8. Contact us">
        <p>
          AfriLynq Limited
          <br />
          58 Rockfield Road, Anfield
          <br />
          Liverpool, United Kingdom
        </p>
        <p>
          Email: <a href="mailto:info@afrilynq.co.uk">info@afrilynq.co.uk</a>
          <br />
          Telephone: <a href="tel:+447721737556">+44 7721 737 556</a>
          <br />
          Website: <a href="https://www.afrilynq.co.uk">www.afrilynq.co.uk</a>
        </p>
      </Section>
    </LegalPage>
  );
}
