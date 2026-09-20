import type { Metadata } from "next";
import AudienceLanding, { type Audience } from "@/components/AudienceLanding";

export const metadata: Metadata = {
  title: "For shoppers",
  description:
    "Buy African produce for your home, restaurant, shop or market stall. No minimum order. Tell AfriLynq what you need and we find a supplier who can meet it.",
  alternates: { canonical: "/for-shoppers" },
};

const AUDIENCE: Audience = {
  kind: "shopper",
  eyebrow: "For households, restaurants, shops and market traders",
  title: "Buy what you actually need, not a container of it",
  lede:
    "You want two bags of garri, a sack of beans, or enough egusi to get through the month. You should not have to buy twenty tonnes to get it, and you should not have to guess whether what arrives is any good.",
  photo: "shoppers",
  cta: "Join as a shopper",
  href: "/register/shopper",
  story: {
    heading: "The quantities were never the point",
    body: [
      "Most African produce reaching the United Kingdom arrives by the container, because that is how export works. The figures you see on this site, twenty tonnes of sesame, a pallet of garri, are what a full export load looks like. They are there so a trade buyer knows what they are dealing with.",
      "They are not a minimum. Suppliers set their own quantities, and plenty of them will sell you a sack. What has been missing is a way for you to ask, and for the right supplier to hear you.",
      "So tell us what you want and how much of it. We take your request to the suppliers who can serve it, and come back with who can supply, at what price, and when. No account fee, no obligation, and no need to know the trade to use it.",
    ],
  },
  steps: [
    {
      n: "01",
      title: "Tell us what you want",
      body: "The product and the quantity that suits you. A bag, a crate, a case. Write it the way you would say it.",
    },
    {
      n: "02",
      title: "We find who can supply it",
      body: "We go to the suppliers who handle smaller volumes for that product, rather than only the container traders.",
    },
    {
      n: "03",
      title: "You see the price",
      body: "What it costs, when it can arrive and how it is packed, so you can decide without haggling in the dark.",
    },
    {
      n: "04",
      title: "It gets to you",
      body: "You deal with the supplier directly. We keep the arrangement moving and step in if something goes wrong.",
    },
  ],
  gains: [
    {
      title: "No minimum order",
      body: "Suppliers set their own quantities. If someone can sell you one sack, you will hear from them.",
    },
    {
      title: "The names you actually use",
      body: "Egusi, ogbono, ugu, okazi, aya, ridi, agbalumo, ube. Search the way you shop, not the way a trade catalogue is written.",
    },
    {
      title: "Produce in season",
      body: "Every product carries its harvest window, so you know when it is at its best rather than buying whatever is in the warehouse.",
    },
    {
      title: "Suppliers who have been checked",
      body: "Company registration, evidence of previous shipments, and one named contact. The same checks a trade buyer gets.",
    },
    {
      title: "A price before you commit",
      body: "You see what it costs and when it arrives before you agree to anything. Nothing is charged for asking.",
    },
    {
      title: "Someone to call",
      body: "A named person at AfriLynq, not a ticket queue and not a WhatsApp group that goes quiet.",
    },
  ],
  faqs: [
    {
      q: "Is there really no minimum?",
      a: "There is no minimum set by AfriLynq. Each supplier decides what they are willing to sell, and some only trade by the container. We take your request to the ones who do not.",
    },
    {
      q: "What does it cost to register?",
      a: "Nothing. Registering and asking for a price is free.",
    },
    {
      q: "Can I buy for my restaurant or shop?",
      a: "Yes. Restaurants, takeaways, corner shops, market stalls and caterers all fit here. If you are buying to resell at volume, the retailer route may suit you better.",
    },
    {
      q: "Where does the produce come from?",
      a: "Twenty seven African origins so far, and the list grows as suppliers are verified. Every product states which countries it can be sourced from.",
    },
    {
      q: "How long does it take?",
      a: "It depends on the product and the season. We tell you the honest answer when we come back to you, including when the answer is that it is out of season.",
    },
  ],
};

export default function ForShoppersPage() {
  return <AudienceLanding a={AUDIENCE} />;
}
