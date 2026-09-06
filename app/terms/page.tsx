import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, ToConfirm } from "@/components/Legal";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The terms on which you may use the AfriLynq website, and the limits of what AfriLynq is responsible for.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated="5 September 2026"
      intro="These terms govern your use of this website. They will be replaced by fuller marketplace terms when supplier and buyer accounts open, at which point separate supplier terms and buyer terms will apply to trading."
    >
      <ToConfirm>
        This is a working draft prepared by the development team, not legal
        advice. Separate supplier terms, buyer terms and a commission or
        subscription agreement will be needed before trading begins, and all of
        them should be drafted or reviewed by a solicitor.
      </ToConfirm>

      <Section heading="Who these terms are with">
        <p>
          This website is operated by AfriLynq. By using it you accept these
          terms. If you do not accept them, please do not use the site.
        </p>
        <ToConfirm>
          The registered company name, company number and registered office of
          the entity that operates the site.
        </ToConfirm>
      </Section>

      <Section heading="What this website is">
        <p>
          This site describes what AfriLynq sources and lets you register an
          interest as a buyer or a supplier. It is informational. Nothing on it
          is an offer to sell, an offer to buy, or a binding quotation.
        </p>
        <p>
          Harvest windows, trading units, minimum order quantities and other
          sourcing information are given as general guidance. Seasons vary with
          rainfall and between origins, and availability changes. Confirm
          anything you intend to rely on with a supplier before you plan around
          it.
        </p>
      </Section>

      <Section heading="AfriLynq is not a party to your trade">
        <p>
          AfriLynq introduces buyers and suppliers. Where a trade follows, the
          contract of sale is between the buyer and the supplier. AfriLynq is not
          the seller, is not the buyer, and does not take title to any goods.
        </p>
        <p>
          You remain responsible for your own commercial and legal due diligence,
          including import requirements, food safety and labelling rules,
          customs, duties, insurance and payment arrangements.
        </p>
      </Section>

      <Section heading="Information you give us">
        <p>
          Information you submit through our forms must be accurate and must be
          yours to give. Do not submit anything unlawful, misleading or
          infringing, and do not use the forms to send unsolicited marketing.
        </p>
        <p>
          We handle what you send us as set out in our{" "}
          <Link href="/privacy">privacy notice</Link>.
        </p>
      </Section>

      <Section heading="Acceptable use">
        <p>
          Do not attempt to gain unauthorised access to any part of the site or
          its infrastructure, introduce malicious code, scrape content at a scale
          that affects performance, or use the site in a way that interferes with
          anyone else&apos;s use of it.
        </p>
      </Section>

      <Section heading="Intellectual property">
        <p>
          The AfriLynq name, logo, page designs, text and other content on this
          site belong to AfriLynq or its licensors. You may read, print and share
          pages for your own business purposes. You may not republish our content
          commercially or present it as your own.
        </p>
      </Section>

      <Section heading="Availability and accuracy">
        <p>
          We aim to keep the site available and its content current, but we do
          not guarantee that it will be uninterrupted or free of errors. We may
          change, suspend or withdraw any part of it without notice.
        </p>
      </Section>

      <Section heading="Liability">
        <p>
          Nothing in these terms excludes or limits liability for death or
          personal injury caused by negligence, for fraud, or for anything else
          that cannot lawfully be excluded.
        </p>
        <p>
          Subject to that, and to the extent permitted by law, AfriLynq is not
          liable for loss of profit, revenue, business, goodwill or anticipated
          savings, or for indirect or consequential loss, arising from your use
          of this site or from reliance on information published on it.
        </p>
        <ToConfirm>
          Whether these limits are appropriate, and whether they need to differ
          for consumers and for business users. This section in particular
          should not go live without legal review.
        </ToConfirm>
      </Section>

      <Section heading="Governing law">
        <p>
          These terms and any dispute arising from them are governed by the law
          of England and Wales, and the courts of England and Wales have
          jurisdiction.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions about these terms can go to{" "}
          <a href="mailto:info@afrilynq.co.uk">info@afrilynq.co.uk</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
