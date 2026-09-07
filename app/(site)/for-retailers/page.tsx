import type { Metadata } from "next";
import AudienceLanding, { type Audience } from "@/components/AudienceLanding";

export const metadata: Metadata = {
  title: "For retailers and buyers",
  description:
    "Source verified African agricultural produce into the United Kingdom. Tell AfriLynq what you need and receive priced quotations you can compare.",
  alternates: { canonical: "/for-retailers" },
};

const AUDIENCE: Audience = {
  kind: "buyer",
  eyebrow: "For retailers, importers and manufacturers",
  title: "Source African produce without flying out to find it",
  lede:
    "You know the specification. You know the volume and the window. What you do not have is a shortlist of suppliers who can actually meet it. That is the part we do.",
  photo: "buyers",
  cta: "Join us as a retailer",
  href: "/register/retailer",
  story: {
    heading: "The problem is not supply, it is certainty",
    body: [
      "There is no shortage of sesame in Nigeria or cocoa in Ghana. What is scarce is a supplier you can be confident in: one whose company documents check out, who has exported before, whose sample matches the shipment, and who answers the phone in March when the container is late.",
      "Most buyers find suppliers through a chain of agents. Each link adds cost, and none of them adds certainty. By the time a price reaches you it has been marked up twice and you still cannot see who is actually growing the crop.",
      "AfriLynq shortens that chain. We verify the company before it is listed, hold your specification so every supplier is answering the same question, and bring back quotations you can lay side by side. You contract directly with the supplier you choose. We do not take a position in the goods and there is no hidden margin, because we are not the seller.",
    ],
  },
  steps: [
    { n: "01", title: "Tell us what you need", body: "Product, volume, specification and the delivery window. If you are not sure what is realistic, say what you are trying to buy." },
    { n: "02", title: "We go to the origins", body: "We approach producers and exporters where the crop grows well and confirm they can meet the specification and export to the United Kingdom." },
    { n: "03", title: "Compare quotations", body: "Priced against your specification, with lead time, incoterm and packaging stated, so you are comparing like with like." },
    { n: "04", title: "Contract direct", body: "You deal with the supplier you choose. We keep the paperwork moving and step in if something goes wrong." },
  ],
  gains: [
    { title: "Suppliers who have been checked", body: "Company registration, evidence of previous export shipments, certificates held on file with expiry dates, and one named accountable contact." },
    { title: "Seasonal intelligence", body: "Every product carries its harvest window, so you buy when the crop is at its best rather than when someone happens to email you." },
    { title: "Comparable quotations", body: "Same specification to every supplier, so the differences you see are real differences and not different assumptions." },
    { title: "United Kingdom requirements up front", body: "Establishment numbers for fish, aflatoxin limits for groundnuts, residue testing for honey. The things that stop a shipment are on the page before you enquire." },
    { title: "No hidden margin", body: "We are not a trader. The contract of sale is between you and the supplier, and you can see the price they quoted." },
    { title: "Someone to call", body: "A named person at AfriLynq stays with the order. Not a ticket queue." },
  ],
  faqs: [
    { q: "What does it cost to register?", a: "Nothing. Registering and receiving quotations is free." },
    { q: "How small an order can you handle?", a: "It varies by product. Dried spice starts around two tonnes, grain usually needs a full container. Each product page states its typical minimum." },
    { q: "Do you handle shipping?", a: "We work with established freight partners and can arrange it, or you can use your own. The incoterm is agreed as part of the quotation." },
    { q: "Who am I actually buying from?", a: "The supplier. AfriLynq introduces you and holds the specification, but the contract of sale is between you and them, and we tell you exactly who they are." },
    { q: "How many suppliers will I hear from?", a: "We are early, and building the directory one verified company at a time. For some products that means two suppliers rather than twenty. We will tell you which, rather than stall." },
  ],
};

export default function ForRetailersPage() {
  return <AudienceLanding a={AUDIENCE} />;
}
