import type { Metadata } from "next";
import AudienceLanding, { type Audience } from "@/components/AudienceLanding";

export const metadata: Metadata = {
  title: "For farmers and exporters",
  description:
    "List your produce on AfriLynq and reach verified buyers in the United Kingdom. Free to register, with verification before your listing goes live.",
  alternates: { canonical: "/for-farmers" },
};

const AUDIENCE: Audience = {
  kind: "supplier",
  eyebrow: "For farmers, co-operatives, processors and exporters",
  title: "Reach buyers who already know what they want to pay for",
  lede:
    "You grow it, process it or ship it. What you are missing is a buyer who can take the volume, has imported before, and will still be there next season. That is who we bring you.",
  photo: "farmers",
  cta: "Join us as a farmer",
  href: "/register/farmer",
  story: {
    heading: "Good produce loses money to bad introductions",
    body: [
      "Most exporters in West and East Africa sell through whoever turns up. An agent arrives, quotes a price, and takes a cut you never see. You have no idea what the buyer paid, and no relationship with them for next season.",
      "The buyers on the other side have the mirror image of the same problem. They cannot tell a serious exporter from someone with a WhatsApp number, so they either pay a trader to take the risk for them, or they do not buy at all.",
      "AfriLynq puts a verified name at each end. We check your company documents, your export history and your certificates once, and after that buyers can see that the checks were done. You quote directly, you keep the relationship, and you know exactly what the buyer is paying because you set the price.",
    ],
  },
  steps: [
    { n: "01", title: "Register your business", body: "Tell us what you supply, where you export from, and roughly what volumes you can handle. It takes a couple of minutes." },
    { n: "02", title: "Verification", body: "We check company registration, evidence of previous export shipments and any certificates you hold. We tell you exactly what we need." },
    { n: "03", title: "List your produce", body: "Your products go live with their specification, harvest window, minimum order and packaging, so buyers arrive already informed." },
    { n: "04", title: "Quote and ship", body: "Buyers send you a specification, you price it, and you contract with them directly." },
  ],
  gains: [
    { title: "Buyers who are already qualified", body: "Every enquiry arrives with a product, a volume and a delivery window attached, so you are not pricing a guess." },
    { title: "You set the price", body: "We do not buy your goods and resell them. You quote the buyer directly and you keep the difference an agent would have taken." },
    { title: "Verification you only do once", body: "The checks are done at the start. After that, every buyer who sees your listing can see that they were done." },
    { title: "The relationship stays yours", body: "You deal with the buyer, so next season they come back to you rather than to whoever introduced you." },
    { title: "We tell you what the buyer needs", body: "Establishment numbers, aflatoxin limits, residue testing, labelling. If something would stop your goods at the border, you hear it before you ship." },
    { title: "Free to list", body: "No charge to register and no charge to be listed." },
  ],
  faqs: [
    { q: "What does it cost?", a: "Registering and being listed is free." },
    { q: "What do I need for verification?", a: "Company registration documents from your country, evidence of a previous export shipment or the licences to make one, copies of any certificates you claim, and one named contact reachable by phone." },
    { q: "I have never exported before. Can I still list?", a: "Yes. Tell us on the form. We will be honest with you about what a first shipment involves before you commit to anything." },
    { q: "How long does verification take?", a: "It depends on how quickly you can send the documents. We will tell you what is outstanding rather than leave you waiting." },
    { q: "Do you take a commission?", a: "AfriLynq does not take a cut of your sale price. Any charge is agreed with you in advance and stated plainly." },
  ],
};

export default function ForFarmersPage() {
  return <AudienceLanding a={AUDIENCE} />;
}
