import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/Legal";

export const metadata: Metadata = {
  title: "Privacy notice",
  description:
    "How AfriLynq Limited collects, uses, stores and protects personal information, and the rights you have over your information.",
  alternates: { canonical: "/privacy" },
};

/**
 * Privacy notice.
 *
 * The text is AfriLynq's own, supplied by the client on 14 September 2026 and
 * published as provided. Responsibility for its legal accuracy sits with
 * AfriLynq under Section 8 of the development agreement.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy notice"
      updated="September 2026"
      intro="AfriLynq Limited operates an online marketplace designed to connect African farmers, producers, suppliers and exporters with buyers, retailers and other businesses in the United Kingdom and potentially other markets. This notice explains how we collect, use, store and protect personal information when you visit our website, create an account, register as a supplier or buyer, submit business information, contact us, make enquiries, request quotations, communicate with other marketplace users or otherwise interact with AfriLynq."
    >
      <Section heading="1. About this privacy notice">
        <p>
          We are committed to handling personal information responsibly,
          lawfully and transparently.
        </p>
      </Section>

      <Section heading="2. Who is responsible for your information">
        <p>
          AfriLynq Limited is responsible for deciding how and why personal
          information is processed in connection with our services.
        </p>
      </Section>

      <Section heading="3. Information we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account information:</strong> full name, email address,
            telephone number, password and login information, account type,
            business name and role.
          </li>
          <li>
            <strong>Supplier information:</strong> business or farm name, farm
            or business location, products supplied, product quantities, prices,
            certifications, business registration information, product
            documentation and export related information where applicable.
          </li>
          <li>
            <strong>Buyer information:</strong> business name, contact details,
            business address, products of interest and purchasing requirements.
          </li>
          <li>
            <strong>Transaction and marketplace information:</strong> enquiries,
            quotations, orders, subscription information and communications
            between marketplace users.
          </li>
          <li>
            <strong>Technical information:</strong> IP address, browser type,
            device information and information about how you use our website.
          </li>
        </ul>
      </Section>

      <Section heading="4. How we use your information">
        <ul className="list-disc space-y-2 pl-5">
          <li>Create and manage accounts.</li>
          <li>Verify users and businesses.</li>
          <li>Operate the AfriLynq marketplace.</li>
          <li>Connect buyers with suppliers.</li>
          <li>
            Facilitate enquiries, quotations, orders and marketplace activities.
          </li>
          <li>Process subscriptions and payments.</li>
          <li>Communicate with users and provide customer support.</li>
          <li>Improve our website and services.</li>
          <li>
            Maintain website security and prevent fraud, misuse and unlawful
            activity.
          </li>
          <li>
            Comply with legal and regulatory obligations and keep appropriate
            business records.
          </li>
          <li>
            Send marketing communications where permitted by law and, where
            required, with your consent.
          </li>
        </ul>
      </Section>

      <Section heading="5. Sharing information">
        <p>
          AfriLynq may share relevant information with buyers and suppliers
          where necessary to facilitate marketplace activities; payment,
          hosting, technology, email, analytics and security providers;
          logistics partners where relevant; professional advisers; regulators
          or law enforcement authorities where legally required; and other
          service providers acting on our behalf.
        </p>
        <p>We do not intend to sell personal information to third parties.</p>
      </Section>

      <Section heading="6. Marketplace information">
        <p>
          Certain supplier information may be displayed to buyers, including
          supplier or business name, product information, location,
          availability, quantities, certifications, pricing or indicative
          pricing, and other information the supplier chooses to make available.
        </p>
        <p>
          Users should not upload confidential or sensitive information unless
          AfriLynq specifically requests it.
        </p>
      </Section>

      <Section heading="7. Payments">
        <p>
          Where payment services are provided through third party payment
          providers, payment card information may be processed directly by the
          relevant payment provider. AfriLynq does not intend to store full
          payment card details on its own systems unless specifically necessary
          and lawfully permitted.
        </p>
      </Section>

      <Section heading="8. Legal basis for processing">
        <p>
          Depending on the circumstances, we may process personal information
          because it is necessary to provide our services or perform a contract;
          we have a legitimate interest in operating and improving our business;
          we have a legal or regulatory obligation; you have provided consent; or
          another lawful basis applies under applicable data protection law.
        </p>
      </Section>

      <Section heading="9. Marketing">
        <p>
          We may send information about AfriLynq, our services, marketplace
          opportunities and relevant business updates. Where applicable, we will
          provide appropriate choices regarding marketing communications and you
          may unsubscribe.
        </p>
      </Section>

      <Section heading="10. How long we keep information">
        <p>
          We retain personal information only for as long as reasonably
          necessary for the purposes for which it was collected, including
          legal, accounting, regulatory, dispute resolution and security
          requirements. Different categories may be retained for different
          periods.
        </p>
      </Section>

      <Section heading="11. International transfers">
        <p>
          Because AfriLynq may operate internationally and work with suppliers
          and service providers outside the United Kingdom, personal information
          may sometimes be transferred outside the United Kingdom. Where
          required, we will use appropriate safeguards.
        </p>
      </Section>

      <Section heading="12. Your rights">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Subject to applicable law, you may have rights to request access,
            correction or deletion; request restriction of processing; object to
            certain processing; withdraw consent where processing relies on
            consent; and exercise other rights available under applicable data
            protection law.
          </li>
          <li>
            To exercise your rights, contact{" "}
            <a href="mailto:info@afrilynq.co.uk">info@afrilynq.co.uk</a>.
          </li>
        </ul>
      </Section>

      <Section heading="13. Security">
        <p>
          We take reasonable technical and organisational measures to protect
          personal information against unauthorised access, loss, misuse,
          alteration or disclosure. However, no internet based service can
          guarantee absolute security.
        </p>
      </Section>

      <Section heading="14. Children">
        <p>
          AfriLynq is primarily intended for businesses, suppliers, farmers,
          retailers and other users who are able to lawfully use our services. We
          do not knowingly seek to collect unnecessary personal information from
          children.
        </p>
      </Section>

      <Section heading="15. Changes to this privacy notice">
        <p>
          We may update this privacy notice from time to time. The latest version
          will be published on our website.
        </p>
      </Section>

      <Section heading="16. Contact us">
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
