import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, ToConfirm } from "@/components/Legal";

export const metadata: Metadata = {
  title: "Privacy notice",
  description:
    "How AfriLynq collects, uses and protects personal data, and the rights you have over your information under UK data protection law.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy notice"
      updated="5 September 2026"
      intro="This notice explains what personal data AfriLynq collects, why we collect it, how long we keep it and what rights you have over it. It covers this website. It will be extended when supplier and buyer accounts open."
    >
      <ToConfirm>
        This is a working draft prepared by the development team, not legal
        advice. AfriLynq should have it reviewed by a solicitor and complete the
        items marked below before the site goes live.
      </ToConfirm>

      <Section heading="Who we are">
        <p>
          AfriLynq operates this website and is the data controller for the
          personal data described in this notice. You can contact us at{" "}
          <a href="mailto:info@afrilynq.co.uk">info@afrilynq.co.uk</a> or at 58
          Rockfield Road, Anfield, Liverpool, United Kingdom.
        </p>
        <ToConfirm>
          The registered company name, company number, registered office and ICO
          registration number. A data controller must identify itself precisely,
          and the address here should match the one on the Companies House
          record.
        </ToConfirm>
      </Section>

      <Section heading="What we collect">
        <p>
          If you complete the sourcing request form or the supplier registration
          form, we collect the name, email address, telephone number, company
          name and country you give us, the product categories you select and
          anything you write in the message field.
        </p>
        <p>
          We also collect limited technical information automatically: your IP
          address, browser type and the pages you visit. This is used to keep the
          site working and to protect the forms from automated abuse.
        </p>
        <p>
          If you consent to analytics cookies, we collect information about how
          you use the site. See our{" "}
          <Link href="/cookies">cookie notice</Link> for the detail.
        </p>
      </Section>

      <Section heading="Why we use it, and our lawful basis">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>To answer your enquiry.</strong> Lawful basis: legitimate
            interests, namely responding to someone who has contacted us about
            doing business.
          </li>
          <li>
            <strong>To assess a supplier for listing.</strong> Lawful basis:
            steps taken at your request before entering into a contract.
          </li>
          <li>
            <strong>To keep the site secure.</strong> Lawful basis: legitimate
            interests, namely preventing abuse of our forms and infrastructure.
          </li>
          <li>
            <strong>To measure how the site is used.</strong> Lawful basis:
            consent, which you give or withhold through the cookie banner and can
            change at any time.
          </li>
        </ul>
        <p>
          We do not sell personal data and we do not use it for automated
          decision making or profiling.
        </p>
      </Section>

      <Section heading="Who we share it with">
        <p>
          We use a small number of service providers who process data on our
          instructions: Supabase for our database and file storage, hosted in the
          United Kingdom; Vercel for website hosting; Resend for sending email;
          and Sentry for error monitoring. Each is bound by a contract that
          restricts what they may do with the data.
        </p>
        <p>
          If you ask us to source a product, we will pass what is necessary to
          the suppliers we approach on your behalf. We will tell you who they are.
          We will not pass your details to anyone else without asking you first.
        </p>
      </Section>

      <Section heading="Where your data is held">
        <p>
          Our database is hosted in the United Kingdom. Some of our service
          providers, and the developers who build and maintain the platform, are
          located outside the United Kingdom. Where personal data is transferred
          outside the UK, that transfer is made under an appropriate safeguard
          recognised by UK data protection law.
        </p>
        <ToConfirm>
          The transfer mechanism covering the development team in Nigeria, most
          likely the UK International Data Transfer Agreement or the UK Addendum
          to the EU standard contractual clauses, together with a transfer risk
          assessment. This must be in place before personal data is processed.
        </ToConfirm>
      </Section>

      <Section heading="How long we keep it">
        <p>
          We keep enquiry and registration details for as long as we are in
          contact with you about the enquiry, and afterwards for a period that
          lets us pick the conversation back up if you return. We delete or
          anonymise data once it no longer serves that purpose.
        </p>
        <ToConfirm>
          Specific retention periods for each category of data. A period stated
          in months is far easier to defend than the general wording above.
        </ToConfirm>
      </Section>

      <Section heading="Your rights">
        <p>
          Under UK data protection law you have the right to ask us for a copy of
          your personal data, to have it corrected, to have it deleted, to
          restrict or object to how we use it, and to receive it in a portable
          format. Where we rely on consent, you can withdraw it at any time
          without affecting anything done before you withdrew it.
        </p>
        <p>
          To exercise any of these, email{" "}
          <a href="mailto:info@afrilynq.co.uk">info@afrilynq.co.uk</a>. We will
          respond within one month.
        </p>
        <p>
          If you are not satisfied with how we have handled your data, you can
          complain to the Information Commissioner&apos;s Office at ico.org.uk or
          on 0303 123 1113. We would rather you came to us first so we can put it
          right.
        </p>
      </Section>

      <Section heading="Security">
        <p>
          Access to personal data is controlled at the database level, so a
          record is only readable by the people entitled to see it. Verification
          documents are stored privately and served through short lived links
          rather than public addresses. Passwords are hashed and never stored in
          readable form. We monitor for errors and unusual activity, and we keep
          development and live environments separate.
        </p>
        <p>
          No system is perfectly secure. If a breach affects your personal data
          and is likely to result in a risk to your rights, we will tell you and
          the Information Commissioner&apos;s Office as the law requires.
        </p>
      </Section>

      <Section heading="Changes to this notice">
        <p>
          We will update this notice as the platform develops, particularly when
          supplier and buyer accounts, messaging and payments are introduced. The
          date at the top shows when it last changed.
        </p>
      </Section>
    </LegalPage>
  );
}
