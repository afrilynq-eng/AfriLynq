import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/Legal";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The terms governing access to and use of the AfriLynq marketplace, including supplier and buyer responsibilities, verification and liability.",
  alternates: { canonical: "/terms" },
};

/**
 * Terms and conditions.
 *
 * AfriLynq's own text, supplied by the client on 14 September 2026 and
 * published as provided. Responsibility for legal accuracy sits with AfriLynq
 * under Section 8 of the development agreement.
 */
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms and conditions"
      updated="September 2026"
      intro="These terms govern access to and use of AfriLynq. AfriLynq is an online marketplace that facilitates connections between suppliers, farmers, producers, exporters, buyers, retailers and other businesses."
    >
      <Section heading="1. About AfriLynq">
        <p>
          AfriLynq is not necessarily the seller, buyer, importer, exporter,
          manufacturer, farmer, distributor or logistics provider in
          transactions between marketplace users.
        </p>
        <p>
          Unless expressly stated otherwise, contracts for the sale of goods are
          between the relevant buyer and supplier.
        </p>
      </Section>

      <Section heading="2. Acceptance of these terms">
        <p>
          By accessing or using AfriLynq, you agree to comply with these terms.
          If you do not agree, you should not use the relevant services.
        </p>
      </Section>

      <Section heading="3. Account registration">
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide accurate and current information.</li>
          <li>Keep login credentials secure.</li>
          <li>Do not share your account with unauthorised persons.</li>
          <li>Promptly update inaccurate information.</li>
          <li>
            Notify AfriLynq if you believe your account has been compromised.
          </li>
        </ul>
      </Section>

      <Section heading="4. Supplier responsibilities">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Suppliers are responsible for ensuring that information they provide
            is accurate and up to date.
          </li>
          <li>
            Suppliers must have the right to sell or supply listed products;
            ensure descriptions, quantities and pricing are accurate; maintain
            required licences and certifications; comply with applicable laws;
            avoid fraudulent documentation; and not use AfriLynq for unlawful
            activities.
          </li>
        </ul>
      </Section>

      <Section heading="5. Buyer responsibilities">
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide accurate business information.</li>
          <li>Provide genuine purchasing requirements.</li>
          <li>Communicate honestly with suppliers.</li>
          <li>Comply with applicable laws.</li>
          <li>Honour contractual obligations entered into with suppliers.</li>
          <li>Not misuse supplier information.</li>
        </ul>
      </Section>

      <Section heading="6. Product listings">
        <p>
          AfriLynq may allow suppliers to publish product listings. We may
          remove, suspend or restrict listings that contain inaccurate
          information, violate law, infringe intellectual property rights, appear
          fraudulent, create security risks, violate these terms or are
          otherwise unsuitable.
        </p>
      </Section>

      <Section heading="7. Verification">
        <p>
          AfriLynq may offer supplier or buyer verification. Verification means
          that AfriLynq has carried out checks based on information and
          documents available to it. Verification does not guarantee quality,
          safety, legality, financial standing, reliability or performance. Users
          should conduct their own due diligence.
        </p>
      </Section>

      <Section heading="8. Transactions between users">
        <p>
          AfriLynq may facilitate introductions, enquiries, quotations,
          negotiations and other marketplace communications. Unless expressly
          stated otherwise, the actual sale and purchase contract is between the
          buyer and supplier.
        </p>
        <p>
          Users are responsible for agreeing price, quantity, quality,
          specifications, delivery, shipping, insurance, payment, customs, import
          and export requirements, taxes and other contractual terms.
        </p>
      </Section>

      <Section heading="9. Product quality and compliance">
        <p>
          Suppliers are responsible for ensuring products comply with applicable
          requirements, including where applicable food safety, product
          standards, labelling, certification, export, import and other United
          Kingdom or international requirements.
        </p>
      </Section>

      <Section heading="10. Logistics">
        <p>
          Where AfriLynq introduces or integrates logistics providers, those
          providers may operate under separate terms. AfriLynq does not guarantee
          delivery times unless expressly agreed in writing.
        </p>
      </Section>

      <Section heading="11. Payments">
        <p>
          Where payment services are available through AfriLynq, payments may be
          processed through third party payment providers. Users may be required
          to accept the relevant provider&apos;s terms.
        </p>
      </Section>

      <Section heading="12. Subscriptions and paid services">
        <p>
          AfriLynq may offer supplier subscriptions, buyer services, featured
          listings, promotional services, premium features and other business
          services. Applicable price, billing period and cancellation
          arrangements will be displayed before purchase.
        </p>
      </Section>

      <Section heading="13. Intellectual property">
        <p>
          The AfriLynq website, branding, logos, software, designs, text and
          other original materials are owned by or licensed to AfriLynq Limited
          unless otherwise stated.
        </p>
        <p>
          Users must not reproduce, copy, modify, distribute or commercially
          exploit AfriLynq content without permission.
        </p>
        <p>
          Users retain ownership of content they submit, subject to the licence
          required by AfriLynq to operate the marketplace.
        </p>
      </Section>

      <Section heading="14. User content">
        <p>
          By uploading information, photographs, product listings, documents or
          other content, you confirm that you have the right to provide it, it is
          not fraudulent, it does not unlawfully infringe another
          person&apos;s rights, and it complies with applicable law.
        </p>
        <p>
          You grant AfriLynq a non exclusive licence to use the content as
          reasonably necessary to operate, promote and improve the marketplace.
        </p>
      </Section>

      <Section heading="15. Prohibited activities">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Users must not use AfriLynq to commit fraud; conduct unlawful
            activities; impersonate another person or business; upload malicious
            software; distribute misleading information; manipulate reviews or
            listings; harvest personal information without permission; interfere
            with website security; infringe intellectual property rights; or
            circumvent security or access controls.
          </li>
        </ul>
      </Section>

      <Section heading="16. Suspension and termination">
        <p>
          AfriLynq may suspend or terminate an account where reasonably
          necessary, including for breach of these terms, fraudulent
          information, security risks, unlawful activity, abuse of other users or
          non payment of applicable charges.
        </p>
      </Section>

      <Section heading="17. Availability">
        <p>
          We aim to keep AfriLynq available and reliable, but do not guarantee
          that the website will always be available, uninterrupted or error free.
          Maintenance, upgrades, technical failures and circumstances outside our
          reasonable control may affect availability.
        </p>
      </Section>

      <Section heading="18. Disclaimer">
        <p>
          AfriLynq provides a marketplace and introduction service. Unless
          expressly stated otherwise, AfriLynq does not guarantee product
          quality, supplier information, financial standing, ability to pay,
          ability to fulfil orders, delivery times, product availability or
          successful completion of transactions.
        </p>
      </Section>

      <Section heading="19. Liability">
        <p>
          Nothing in these terms excludes or limits liability where doing so
          would be unlawful. To the extent permitted by law, AfriLynq is not
          responsible for losses arising solely from a transaction or agreement
          between independent marketplace users where AfriLynq is not a party to
          that transaction.
        </p>
      </Section>

      <Section heading="20. Privacy">
        <p>
          Personal information is handled in accordance with the{" "}
          <a href="/privacy">AfriLynq privacy notice</a>.
        </p>
      </Section>

      <Section heading="21. Cookies">
        <p>
          Our use of cookies and similar technologies is explained in the{" "}
          <a href="/cookies">AfriLynq cookie policy</a>.
        </p>
      </Section>

      <Section heading="22. Changes to these terms">
        <p>
          We may update these terms from time to time. Updated terms will be
          published on the website.
        </p>
      </Section>

      <Section heading="23. Governing law">
        <p>
          These terms are governed by the laws of England and Wales, unless
          applicable law requires otherwise. The courts of England and Wales will
          have jurisdiction, subject to any mandatory rights available to
          consumers or other users under applicable law.
        </p>
      </Section>

      <Section heading="24. Contact">
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
