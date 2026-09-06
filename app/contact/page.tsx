import type { Metadata } from "next";
import LeadForm from "@/components/LeadForm";

export const metadata: Metadata = {
  title: "Contact AfriLynq",
  description:
    "Send AfriLynq a sourcing request, register produce you export, or contact the team directly.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-10">
        <h1 className="max-w-3xl text-4xl sm:text-5xl">Contact</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Two forms below, depending on which side of the trade you are on. Both reach
          the same inbox and both get a reply.
        </p>
      </section>

      <section id="buy" className="border-t border-sand-deep scroll-mt-6">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <LeadForm kind="buyer" />
        </div>
      </section>

      <section id="supply" className="border-t border-sand-deep bg-sand scroll-mt-6">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <LeadForm kind="supplier" />
        </div>
      </section>

      <section className="border-t border-sand-deep">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h2 className="text-lg">Email</h2>
            <p className="mt-3">
              <a href="mailto:info@afrilynq.co.uk" className="link-quiet text-ink-soft">
                info@afrilynq.co.uk
              </a>
            </p>
            <p className="mt-2 text-sm text-stone">
              The fastest route if you already know what you need.
            </p>
          </div>

          <div>
            <h2 className="text-lg">Registered address</h2>
            <address className="mt-3 not-italic leading-relaxed text-ink-soft">
              58 Rockfield Road
              <br />
              Anfield, Liverpool
              <br />
              United Kingdom
            </address>
          </div>

          <div>
            <h2 className="text-lg">What happens next</h2>
            <p className="mt-3 leading-relaxed text-ink-soft">
              We read every enquiry ourselves. Sourcing requests take longer to answer
              properly, because we go to the suppliers before we come back to you.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
