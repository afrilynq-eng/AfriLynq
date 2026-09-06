/**
 * Sourcing content for the public site.
 *
 * Categories and products are AfriLynq's own list, supplied 6 September 2026.
 * Harvest windows, trading units and minimum order quantities reflect how
 * these goods actually move out of West and East Africa. AfriLynq should
 * confirm the units and minimums against its own supplier base before launch
 * and correct anything that does not match.
 *
 * Nothing here claims a supplier count, a delivery percentage, an escrow
 * facility or a customer testimonial. None of those exist yet, and this is a
 * United Kingdom site where an unsubstantiated claim is a regulatory exposure
 * as well as a credibility one.
 */

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export type Availability = "peak" | "available" | "none";

export interface Product {
  name: string;
  /** Photo filename stem: public/photos/products/<slug>.jpg */
  slug: string;
  origins: string[];
  /** Twelve entries, January to December. */
  calendar: Availability[];
  unit: string;
  minimumOrder: string;
  note: string;
}

export interface Category {
  slug: string;
  name: string;
  summary: string;
  intro: string;
  /** What a buyer typically needs to state when enquiring. */
  specify: string[];
  products: Product[];
}

function months(peak: number[], available: number[] = []): Availability[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    if (peak.includes(m)) return "peak";
    if (available.includes(m)) return "available";
    return "none";
  });
}

const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const except = (...m: number[]) => ALL.filter((x) => !m.includes(x));

export const CATEGORIES: Category[] = [
  {
    slug: "grains-and-seeds",
    name: "Grains and seeds",
    summary:
      "Sesame, soybeans, groundnuts, beans, millet and sorghum, harvested from October and traded by container load.",
    intro:
      "Grains and oilseeds are the backbone of West African agricultural export. They store well, which means the buying decision turns on grade and cleanliness rather than on shipping speed. Most of the crop is harvested between October and February, and quality is judged on three numbers: moisture, foreign matter and broken percentage.",
    specify: [
      "Moisture content, foreign matter and broken percentage",
      "Purity, and for sesame whether white or brown",
      "Bagged or bulk, and the bag weight",
      "Whether fumigation before loading is required",
      "Aflatoxin limits where they apply, particularly for groundnuts",
      "Incoterm and load port",
    ],
    products: [
      {
        name: "Sesame seed",
        slug: "sesame",
        origins: ["Nigeria", "Ethiopia", "Tanzania"],
        calendar: months([12, 1, 2], [3, 4, 11]),
        unit: "Metric tonne",
        minimumOrder: "One 20 ft container, about 25 tonnes",
        note: "White and brown varieties, sold on purity. The Nigerian crop is harvested from November and ships through to about April.",
      },
      {
        name: "Soybeans",
        slug: "soybeans",
        origins: ["Nigeria"],
        calendar: months([10, 11, 12], [1, 9]),
        unit: "Metric tonne",
        minimumOrder: "One 20 ft container",
        note: "Non genetically modified crop. Protein and oil content should be agreed before shipment rather than tested on arrival.",
      },
      {
        name: "Groundnuts",
        slug: "groundnuts",
        origins: ["Nigeria", "Ghana"],
        calendar: months([11, 12], [10, 1, 2]),
        unit: "Metric tonne",
        minimumOrder: "One 20 ft container",
        note: "Blanched, raw or in shell. Aflatoxin testing is normally required for the United Kingdom and should be agreed up front.",
      },
      {
        name: "Beans",
        slug: "beans",
        origins: ["Nigeria"],
        calendar: months([10, 11, 12], [1, 2]),
        unit: "Metric tonne",
        minimumOrder: "One 20 ft container",
        note: "Brown and white cowpea. Pesticide residue limits are strict for this crop, so confirm the treatment history with the supplier.",
      },
      {
        name: "Millet",
        slug: "millet",
        origins: ["Nigeria"],
        calendar: months([10, 11], [9, 12, 1]),
        unit: "Metric tonne",
        minimumOrder: "One 20 ft container",
        note: "Pearl millet, sold whole or milled. Growing United Kingdom demand for gluten free flour and for bird feed.",
      },
      {
        name: "Sorghum",
        slug: "sorghum",
        origins: ["Nigeria"],
        calendar: months([11, 12], [10, 1, 2]),
        unit: "Metric tonne",
        minimumOrder: "One 20 ft container",
        note: "White and red varieties. Used mainly for brewing and animal feed.",
      },
    ],
  },
  {
    slug: "spices-and-botanicals",
    name: "Spices and botanicals",
    summary:
      "Ginger, turmeric, chilli, hibiscus and moringa, dried at origin and shipped through the year.",
    intro:
      "Dried spice is one of the easier categories to begin with, because the goods are stable and order sizes are smaller than for grain. What decides whether a supplier is workable is consistency between the sample and the shipment, and documentation that satisfies United Kingdom food safety requirements on arrival.",
    specify: [
      "Whole, split, sliced or ground",
      "Moisture content, and for ginger the oil content",
      "Sieve or particle size where ground",
      "Whether steam sterilised material is required",
      "Pesticide residue and heavy metal testing requirements",
    ],
    products: [
      {
        name: "Ginger",
        slug: "ginger",
        origins: ["Nigeria"],
        calendar: months([2, 3], except(2, 3)),
        unit: "Metric tonne",
        minimumOrder: "5 tonnes",
        note: "Dried split and sliced. The Kaduna crop is harvested from January, and dried material ships year round from stock with the best pricing shortly after harvest.",
      },
      {
        name: "Turmeric",
        slug: "turmeric",
        origins: ["Nigeria"],
        calendar: months([1, 2, 3], [4, 12]),
        unit: "Metric tonne",
        minimumOrder: "2 tonnes",
        note: "Whole fingers or ground. Buyers usually specify a minimum curcumin content, and it is worth testing before shipment.",
      },
      {
        name: "Chilli",
        slug: "chilli",
        origins: ["Nigeria", "Ghana"],
        calendar: months([12, 1, 2], [3, 11]),
        unit: "Metric tonne",
        minimumOrder: "2 tonnes",
        note: "Whole dried or ground. Heat varies considerably between varieties, so agree a reference sample before pricing.",
      },
      {
        name: "Hibiscus",
        slug: "hibiscus",
        origins: ["Nigeria"],
        calendar: months([12, 1, 2], [3, 11]),
        unit: "Metric tonne",
        minimumOrder: "2 tonnes",
        note: "Sold as sorrel or zobo. Colour and calyx integrity drive the grade. Used for herbal infusions and natural colouring.",
      },
      {
        name: "Moringa",
        slug: "moringa",
        origins: ["Nigeria", "Ghana"],
        calendar: months([], ALL),
        unit: "Metric tonne",
        minimumOrder: "1 tonne",
        note: "Dried leaf, leaf powder and seed. Leaf is available all year; seed follows the October to December window.",
      },
    ],
  },
  {
    slug: "nuts-and-superfoods",
    name: "Nuts and superfoods",
    summary:
      "Cashew, tiger nuts, shea nuts and bambara nuts, traded on grade and outturn.",
    intro:
      "West Africa supplies a large share of the world's raw cashew, and the smaller crops in this group are growing quickly with United Kingdom demand for plant based ingredients. These are storable goods, so the negotiation is about specification rather than speed.",
    specify: [
      "Grade or outturn, including nut count per kilogram for cashew",
      "Defective percentage and moisture content",
      "Packaging: jute bags, polypropylene or bulk",
      "Whether phytosanitary and fumigation certificates are required",
      "Incoterm and load port",
    ],
    products: [
      {
        name: "Cashew nuts",
        slug: "cashew",
        origins: ["Nigeria", "Cote d Ivoire", "Ghana", "Tanzania"],
        calendar: months([3, 4], [2, 5, 6]),
        unit: "Metric tonne",
        minimumOrder: "One 20 ft container, about 16 tonnes",
        note: "Raw in shell, traded on nut count and outturn. The Nigerian and Ivorian crops open in February and thin out by June.",
      },
      {
        name: "Tiger nuts",
        slug: "tiger-nuts",
        origins: ["Nigeria"],
        calendar: months([12, 1, 2], [3, 11]),
        unit: "Metric tonne",
        minimumOrder: "5 tonnes",
        note: "Sold dried and whole. United Kingdom demand is driven by plant milk and snack producers.",
      },
      {
        name: "Shea nuts",
        slug: "shea-nuts",
        origins: ["Nigeria", "Ghana"],
        calendar: months([7, 8], [6, 9, 10]),
        unit: "Metric tonne",
        minimumOrder: "One 20 ft container",
        note: "Collection runs through the wet season. Processed shea butter is available year round and is listed under oils.",
      },
      {
        name: "Bambara nuts",
        slug: "bambara-nuts",
        origins: ["Nigeria", "Ghana"],
        calendar: months([10, 11, 12], [1, 9]),
        unit: "Metric tonne",
        minimumOrder: "2 tonnes",
        note: "Also called okpa or gurjiya. Sold dried, mainly into diaspora retail and increasingly to plant protein producers.",
      },
    ],
  },
  {
    slug: "cocoa-and-natural-ingredients",
    name: "Cocoa and natural ingredients",
    summary:
      "Main crop cocoa beans from the Gulf of Guinea, plus locally processed powder and butter.",
    intro:
      "Cocoa is the category where origin is part of the product rather than a logistics detail. Buyers are usually looking for a specific region, and increasingly for traceability back to a co-operative or farm group. Certification is common and should be established before pricing, not after.",
    specify: [
      "Main crop or light crop, and the crop year",
      "Bean count, moisture and defect count",
      "Fat content for butter, and fat percentage for powder",
      "Natural or alkalised, for powder",
      "Certification: organic, Fairtrade, Rainforest Alliance",
      "Whether traceability to co-operative level is required",
    ],
    products: [
      {
        name: "Cocoa beans",
        slug: "cocoa-beans",
        origins: ["Nigeria", "Ghana", "Cote d Ivoire", "Cameroon"],
        calendar: months([10, 11, 12, 1], [2, 3, 5, 6]),
        unit: "Metric tonne",
        minimumOrder: "One 20 ft container, about 14 tonnes",
        note: "Main crop opens in October. Light crop material is available from about May but trades on a different basis.",
      },
      {
        name: "Cocoa powder",
        slug: "cocoa-powder",
        origins: ["Nigeria", "Ghana"],
        calendar: months([], ALL),
        unit: "Metric tonne",
        minimumOrder: "5 tonnes",
        note: "Natural and alkalised, processed at origin. Available from stock year round, subject to grinding capacity.",
      },
      {
        name: "Cocoa butter",
        slug: "cocoa-butter",
        origins: ["Nigeria", "Ghana"],
        calendar: months([], ALL),
        unit: "Metric tonne",
        minimumOrder: "5 tonnes",
        note: "Food grade and cosmetic grade are different products at different prices. State which before asking for a quotation.",
      },
    ],
  },
  {
    slug: "oils",
    name: "Oils",
    summary: "Palm, palm kernel, sesame and groundnut oil, available through the year.",
    intro:
      "Oils trade continuously rather than seasonally, with pricing that follows the underlying crop. Two questions decide whether a supplier is workable for the United Kingdom market: the level of refinement, and whether the material can be certified sustainable where that is required.",
    specify: [
      "Crude, semi refined or fully refined",
      "Free fatty acid content and moisture",
      "Food grade or cosmetic grade",
      "Packaging: drums, jerry cans, IBC or flexitank",
      "Sustainability certification where required",
    ],
    products: [
      {
        name: "Palm oil",
        slug: "palm-oil",
        origins: ["Nigeria", "Ghana", "Cameroon"],
        calendar: months([2, 3, 4, 5], except(2, 3, 4, 5)),
        unit: "Metric tonne",
        minimumOrder: "One flexitank, about 20 tonnes",
        note: "Crude and refined. Peak production runs February to May. Free fatty acid content is the number that decides the price.",
      },
      {
        name: "Palm kernel oil",
        slug: "palm-kernel-oil",
        origins: ["Nigeria", "Ghana"],
        calendar: months([2, 3, 4, 5], except(2, 3, 4, 5)),
        unit: "Metric tonne",
        minimumOrder: "5 tonnes",
        note: "Distinct from palm oil in composition and use. Sold into food manufacturing, soap and cosmetics.",
      },
      {
        name: "Sesame oil",
        slug: "sesame-oil",
        origins: ["Nigeria"],
        calendar: months([1, 2, 3], except(1, 2, 3)),
        unit: "Metric tonne",
        minimumOrder: "2 tonnes",
        note: "Cold pressed and refined. Best pricing follows the December to February seed crop.",
      },
      {
        name: "Groundnut oil",
        slug: "groundnut-oil",
        origins: ["Nigeria"],
        calendar: months([12, 1, 2], except(12, 1, 2)),
        unit: "Metric tonne",
        minimumOrder: "5 tonnes",
        note: "Cold pressed and refined. Aflatoxin testing applies to the oil as well as to the nut.",
      },
    ],
  },
  {
    slug: "roots-and-processed-foods",
    name: "Roots and processed foods",
    summary:
      "Garri, cassava flour and chips, yam and yam flour, plantain flour and potato.",
    intro:
      "This category serves the United Kingdom diaspora retail trade and the growing set of mainstream retailers stocking West African staples. Order sizes are smaller, turnover is faster, and labelling is the thing that most often stops a shipment at the border. Get the label right before the first order rather than after it.",
    specify: [
      "Retail pack size and case configuration",
      "Moisture content and shelf life remaining on arrival",
      "United Kingdom compliant labelling, including allergens and nutrition",
      "Barcode, and whether own label is possible",
      "Whether the producer holds a recognised food safety certification",
    ],
    products: [
      {
        name: "Garri",
        slug: "garri",
        origins: ["Nigeria", "Ghana"],
        calendar: months([], ALL),
        unit: "Carton",
        minimumOrder: "One pallet",
        note: "White and yellow. Moisture control decides shelf life, so ask what the producer measures and how often.",
      },
      {
        name: "Cassava flour",
        slug: "cassava-flour",
        origins: ["Nigeria", "Ghana"],
        calendar: months([], ALL),
        unit: "Carton",
        minimumOrder: "One pallet",
        note: "Includes fufu and pounded yam style flours. Growing mainstream demand as a gluten free ingredient.",
      },
      {
        name: "Cassava chips",
        slug: "cassava-chips",
        origins: ["Nigeria"],
        calendar: months([], ALL),
        unit: "Metric tonne",
        minimumOrder: "One 20 ft container",
        note: "Dried chips for industrial starch, ethanol and animal feed. Traded on starch content and moisture.",
      },
      {
        name: "Yam",
        slug: "yam",
        origins: ["Nigeria", "Ghana"],
        calendar: months([10, 11, 12, 1], [2, 3, 9]),
        unit: "Carton or crate",
        minimumOrder: "One pallet",
        note: "Puna yam ships from about September through the winter. Handling and packing decide how much arrives saleable.",
      },
      {
        name: "Yam flour",
        slug: "yam-flour",
        origins: ["Nigeria"],
        calendar: months([], ALL),
        unit: "Carton",
        minimumOrder: "One pallet",
        note: "Elubo. Milled and packed at origin, available year round from stock.",
      },
      {
        name: "Plantain flour",
        slug: "plantain-flour",
        origins: ["Nigeria", "Ghana", "Uganda"],
        calendar: months([], ALL),
        unit: "Carton",
        minimumOrder: "One pallet",
        note: "Unripe plantain, milled. Packaging quality varies widely between producers, so ask for physical samples.",
      },
      {
        name: "Potato",
        slug: "potato",
        origins: ["Nigeria"],
        calendar: months([8, 9, 10], [3, 4, 11]),
        unit: "Bag or crate",
        minimumOrder: "One pallet",
        note: "Irish and sweet potato from the Plateau highlands. Main crop from August, with a smaller second window in spring.",
      },
    ],
  },
  {
    slug: "seafood-and-animal-products",
    name: "Seafood and animal products",
    summary: "Dried and smoked fish, prawns, honey, beeswax and hides and skins.",
    intro:
      "This is the most tightly regulated category on the platform. Fish and animal products entering the United Kingdom must come from an approved establishment, and honey is subject to residue testing. Establish the approvals before you negotiate a price, because without them the goods cannot land at any price.",
    specify: [
      "The producer's approved establishment number for United Kingdom import",
      "Species, size grade and packing format",
      "Moisture content for dried fish, and residue testing for honey",
      "Cold chain requirements where applicable",
      "Shelf life remaining on arrival",
    ],
    products: [
      {
        name: "Dried fish",
        slug: "dried-fish",
        origins: ["Nigeria", "Ghana"],
        calendar: months([], ALL),
        unit: "Carton",
        minimumOrder: "One pallet",
        note: "Stockfish, catfish and tilapia. An approved establishment number is required for import into the United Kingdom. Confirm it before ordering.",
      },
      {
        name: "Smoked fish",
        slug: "smoked-fish",
        origins: ["Nigeria", "Ghana"],
        calendar: months([], ALL),
        unit: "Carton",
        minimumOrder: "One pallet",
        note: "Sold mainly into diaspora retail. Same approval requirement as dried fish, and moisture control decides shelf life.",
      },
      {
        name: "Prawns",
        slug: "prawns",
        origins: ["Nigeria"],
        calendar: months([7, 8, 9, 10], [6, 11]),
        unit: "Carton",
        minimumOrder: "One pallet",
        note: "Dried and frozen. Size grade drives the price. Frozen product needs an unbroken cold chain and the paperwork to prove it.",
      },
      {
        name: "Honey",
        slug: "honey",
        origins: ["Nigeria", "Cameroon"],
        calendar: months([12, 1, 2, 3], [11, 4]),
        unit: "Metric tonne",
        minimumOrder: "1 tonne",
        note: "Raw and filtered. United Kingdom import requires residue testing, and buyers increasingly ask for pollen analysis to confirm origin.",
      },
      {
        name: "Beeswax",
        slug: "beeswax",
        origins: ["Nigeria", "Cameroon"],
        calendar: months([12, 1, 2, 3], [11, 4]),
        unit: "Metric tonne",
        minimumOrder: "1 tonne",
        note: "Crude and refined blocks, following the honey harvest. Sold into cosmetics, candles and food coating.",
      },
      {
        name: "Hides and skins",
        slug: "hides-and-skins",
        origins: ["Nigeria"],
        calendar: months([], ALL),
        unit: "Metric tonne",
        minimumOrder: "One 20 ft container",
        note: "Wet salted and dried. Veterinary health certification is required for import, and grade depends heavily on flaying quality.",
      },
    ],
  },
];

export interface Origin {
  country: string;
  region: string;
  knownFor: string;
}

export const ORIGINS: Origin[] = [
  { country: "Nigeria", region: "West Africa", knownFor: "Sesame, ginger, hibiscus, cashew, palm oil, cassava products" },
  { country: "Ghana", region: "West Africa", knownFor: "Cocoa, shea, cassava products, dried fish" },
  { country: "Cote d Ivoire", region: "West Africa", knownFor: "Cocoa, cashew" },
  { country: "Cameroon", region: "Central Africa", knownFor: "Cocoa, palm oil, honey" },
  { country: "Kenya", region: "East Africa", knownFor: "Herbs, honey, horticultural produce" },
  { country: "Uganda", region: "East Africa", knownFor: "Sesame, dried fruit, plantain products" },
  { country: "Tanzania", region: "East Africa", knownFor: "Cashew, sesame" },
  { country: "Ethiopia", region: "East Africa", knownFor: "Sesame, pulses, spices" },
];

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/** Aggregate a category's product calendars into one twelve month row. */
export function categoryCalendar(category: Category): Availability[] {
  return Array.from({ length: 12 }, (_, i) => {
    const cells = category.products.map((p) => p.calendar[i]);
    if (cells.includes("peak")) return "peak";
    if (cells.includes("available")) return "available";
    return "none";
  });
}
