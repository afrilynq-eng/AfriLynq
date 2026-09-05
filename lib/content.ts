/**
 * Sourcing content for the public site.
 *
 * This is deliberately real. Harvest windows, units and minimum order
 * quantities below reflect how these crops actually trade out of West and East
 * Africa. Before launch, AfriLynq should confirm the categories and origins it
 * is opening with, and correct anything here that does not match.
 *
 * Nothing on the public site claims a supplier count, a delivery percentage,
 * an escrow facility or a customer testimonial. None of those exist yet, and
 * the platform is trading into the United Kingdom where an unsubstantiated
 * claim is an advertising problem as well as a credibility one.
 */

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export type Availability = "peak" | "available" | "none";

export interface Product {
  name: string;
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
  /** One line, used in listings and as the meta description base. */
  summary: string;
  /** Two or three sentences, used on the category page. */
  intro: string;
  /** What a UK buyer typically needs to specify when enquiring. */
  specify: string[];
  products: Product[];
}

/** Shorthand for building a twelve month row without writing it out longhand. */
function months(peak: number[], available: number[] = []): Availability[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    if (peak.includes(m)) return "peak";
    if (available.includes(m)) return "available";
    return "none";
  });
}

const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const CATEGORIES: Category[] = [
  {
    slug: "nuts-and-seeds",
    name: "Nuts and seeds",
    summary:
      "Cashew, sesame, shea and groundnut from West Africa, traded by container load.",
    intro:
      "West Africa supplies a large share of the world's raw cashew and a growing share of its sesame. These are storable crops, which means the buying decision is driven by grade, outturn and moisture rather than by shipping speed. Most trade here moves in twenty and forty foot containers against a pre agreed specification.",
    specify: [
      "Grade or outturn, for example cashew nut count per kilogram and defective percentage",
      "Moisture content and the method used to measure it",
      "Packaging: jute bags, polypropylene, or bulk",
      "Incoterm and load port",
      "Whether you require phytosanitary and fumigation certificates",
    ],
    products: [
      {
        name: "Raw cashew nuts",
        origins: ["Nigeria", "Cote d Ivoire", "Ghana", "Tanzania"],
        calendar: months([3, 4], [2, 5, 6]),
        unit: "Metric tonne",
        minimumOrder: "One 20 ft container, about 16 tonnes",
        note: "Traded on nut count and outturn. Nigerian and Ivorian crops open in February and thin out by June.",
      },
      {
        name: "Sesame seed",
        origins: ["Nigeria", "Ethiopia", "Tanzania"],
        calendar: months([12, 1, 2], [3, 4, 11]),
        unit: "Metric tonne",
        minimumOrder: "One 20 ft container, about 25 tonnes",
        note: "White and brown varieties. Nigerian crop is harvested from November and ships through to about April.",
      },
      {
        name: "Shea nuts and shea butter",
        origins: ["Nigeria", "Ghana"],
        calendar: months([7, 8], [6, 9, 10]),
        unit: "Metric tonne",
        minimumOrder: "5 tonnes for butter, one container for nuts",
        note: "Nut collection runs through the wet season. Processed butter is available year round from stock.",
      },
      {
        name: "Groundnuts",
        origins: ["Nigeria", "Ghana"],
        calendar: months([11, 12], [10, 1, 2]),
        unit: "Metric tonne",
        minimumOrder: "One 20 ft container",
        note: "Aflatoxin testing is normally required for the United Kingdom and should be agreed before shipment.",
      },
      {
        name: "Tiger nuts",
        origins: ["Nigeria"],
        calendar: months([12, 1, 2], [3, 11]),
        unit: "Metric tonne",
        minimumOrder: "5 tonnes",
        note: "Sold dried, whole. Demand in the United Kingdom is driven by plant milk and snack producers.",
      },
    ],
  },
  {
    slug: "spices-and-herbs",
    name: "Spices and herbs",
    summary:
      "Ginger, turmeric, dried chilli and hibiscus, mostly dried and shipped year round.",
    intro:
      "Dried spice is one of the easier categories to start with, because the goods are stable and the order sizes are smaller than for grain or nuts. What matters is consistency between samples and shipments, and documentation that satisfies United Kingdom food safety requirements on arrival.",
    specify: [
      "Whole, split, sliced or ground",
      "Moisture content and, for ginger, oil content",
      "Sieve size or particle size where ground",
      "Whether steam sterilised material is required",
      "Pesticide residue and heavy metal testing requirements",
    ],
    products: [
      {
        name: "Dried split ginger",
        origins: ["Nigeria"],
        calendar: months([2, 3], ALL.filter((m) => ![2, 3].includes(m))),
        unit: "Metric tonne",
        minimumOrder: "5 tonnes",
        note: "The Kaduna crop is harvested from January. Dried material ships year round from stock, with the best pricing shortly after harvest.",
      },
      {
        name: "Dried hibiscus flower",
        origins: ["Nigeria"],
        calendar: months([12, 1, 2], [3, 11]),
        unit: "Metric tonne",
        minimumOrder: "2 tonnes",
        note: "Sold as sorrel or zobo. Colour and calyx integrity drive the grade. Used in the United Kingdom for herbal infusions and natural colouring.",
      },
      {
        name: "Turmeric fingers",
        origins: ["Nigeria"],
        calendar: months([1, 2, 3], [4, 12]),
        unit: "Metric tonne",
        minimumOrder: "2 tonnes",
        note: "Buyers usually specify a minimum curcumin content. Ask for it to be tested before shipment rather than on arrival.",
      },
      {
        name: "Dried chilli",
        origins: ["Nigeria", "Ghana"],
        calendar: months([12, 1, 2], [3, 11]),
        unit: "Metric tonne",
        minimumOrder: "2 tonnes",
        note: "Whole or ground. Heat level varies considerably by variety, so agree a reference sample.",
      },
      {
        name: "Gum arabic",
        origins: ["Nigeria"],
        calendar: months([1, 2, 3], [11, 12, 4, 5]),
        unit: "Metric tonne",
        minimumOrder: "5 tonnes",
        note: "Grades one to three. Tapping season runs from about November to May in the northern belt.",
      },
    ],
  },
  {
    slug: "cocoa-and-coffee",
    name: "Cocoa and coffee",
    summary:
      "Main crop cocoa from the Gulf of Guinea and arabica and robusta from East Africa.",
    intro:
      "These are the two categories where origin is part of the product rather than a logistics detail. Buyers are usually looking for a specific profile, a specific region, and increasingly for traceability back to a co-operative or a farm group. Certification is common and should be established before pricing.",
    specify: [
      "Main crop or light crop, and crop year",
      "Bean count, moisture and defect count for cocoa",
      "Screen size, processing method and cup score for coffee",
      "Certification: organic, Fairtrade, Rainforest Alliance",
      "Whether traceability to co-operative level is required",
    ],
    products: [
      {
        name: "Cocoa beans, main crop",
        origins: ["Ghana", "Cote d Ivoire", "Nigeria", "Cameroon"],
        calendar: months([10, 11, 12, 1], [2, 3]),
        unit: "Metric tonne",
        minimumOrder: "One 20 ft container, about 14 tonnes",
        note: "Main crop opens in October. Light crop material is available from about May but trades on a different basis.",
      },
      {
        name: "Arabica coffee, washed",
        origins: ["Ethiopia", "Kenya", "Rwanda"],
        calendar: months([11, 12, 1], [2, 10]),
        unit: "60 kg bag",
        minimumOrder: "One pallet, or a container for a single lot",
        note: "Ethiopian and Kenyan main crops arrive at port from about November. Ask for a sample and a cup score before committing.",
      },
      {
        name: "Robusta coffee",
        origins: ["Uganda", "Tanzania"],
        calendar: months([11, 12, 1], [5, 6, 7, 8]),
        unit: "60 kg bag",
        minimumOrder: "One 20 ft container",
        note: "Uganda has two windows, the larger from November and a second from about May.",
      },
      {
        name: "Cocoa butter and cake",
        origins: ["Ghana", "Nigeria"],
        calendar: months([], ALL),
        unit: "Metric tonne",
        minimumOrder: "5 tonnes",
        note: "Processed locally and available from stock year round, subject to grinding capacity.",
      },
    ],
  },
  {
    slug: "fresh-produce",
    name: "Fresh produce",
    summary:
      "Airfreight and reefer lines for avocado, mango, pineapple and vegetables.",
    intro:
      "Fresh produce is the most demanding category on this platform and the one where the supplier's cold chain matters more than the price. Kenya has the most established route into the United Kingdom, with West African mango and pineapple following seasonal windows. Airfreight is usual for vegetables and early season fruit, sea freight for avocado at volume.",
    specify: [
      "Variety and size count per carton",
      "Airfreight or sea freight, and the arrival airport or port",
      "Cold chain temperature and whether pre cooling is required",
      "Packaging format and whether retail ready is needed",
      "GLOBALG.A.P. or equivalent, and the certificate number",
    ],
    products: [
      {
        name: "Hass avocado",
        origins: ["Kenya", "Tanzania"],
        calendar: months([4, 5, 6, 7], [3, 8, 9]),
        unit: "4 kg carton",
        minimumOrder: "One pallet by air, one container by sea",
        note: "Kenyan Hass season runs from about March to September. Dry matter at harvest is the single most useful thing to agree.",
      },
      {
        name: "Mango",
        origins: ["Ghana", "Cote d Ivoire", "Kenya"],
        calendar: months([4, 5, 6], [11, 12, 1, 2, 3]),
        unit: "4 kg carton",
        minimumOrder: "One pallet",
        note: "West African season runs March to June. Kenyan fruit fills part of the northern winter.",
      },
      {
        name: "Pineapple",
        origins: ["Ghana", "Cote d Ivoire"],
        calendar: months([1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11, 12]),
        unit: "Carton or bulk",
        minimumOrder: "One pallet",
        note: "MD2 and sugarloaf. Available most of the year with a stronger first half.",
      },
      {
        name: "Fine beans and snow peas",
        origins: ["Kenya"],
        calendar: months([], ALL),
        unit: "Kilogram",
        minimumOrder: "500 kg by air",
        note: "Grown for the European market year round. Airfreight only, with a short window between harvest and arrival.",
      },
      {
        name: "Yam and plantain",
        origins: ["Nigeria", "Ghana"],
        calendar: months([10, 11, 12, 1], [2, 3, 9]),
        unit: "Carton or crate",
        minimumOrder: "One pallet",
        note: "Puna yam ships from about September through the winter. Plantain is available year round.",
      },
    ],
  },
  {
    slug: "grains-and-cereals",
    name: "Grains and cereals",
    summary:
      "Sorghum, maize, soybean and rice, harvested from October and traded in bulk.",
    intro:
      "Grain is a volume category with thin margins, and it rewards buyers who can take a full container and hold it. Most of the West African crop is harvested between October and January. Quality is judged on moisture, foreign matter and broken percentage, and those three numbers should be in the enquiry rather than discovered on arrival.",
    specify: [
      "Moisture, foreign matter and broken percentage",
      "Bagged or bulk, and bag weight",
      "Whether fumigation before loading is required",
      "Aflatoxin limits where applicable",
      "Load port and required delivery window",
    ],
    products: [
      {
        name: "Sorghum",
        origins: ["Nigeria"],
        calendar: months([11, 12], [10, 1, 2]),
        unit: "Metric tonne",
        minimumOrder: "One 20 ft container",
        note: "White and red varieties. Used in the United Kingdom mainly for brewing and animal feed.",
      },
      {
        name: "Soybean",
        origins: ["Nigeria"],
        calendar: months([10, 11, 12], [1, 9]),
        unit: "Metric tonne",
        minimumOrder: "One 20 ft container",
        note: "Non genetically modified crop. Protein and oil content should be specified.",
      },
      {
        name: "Maize",
        origins: ["Nigeria", "Ghana", "Tanzania"],
        calendar: months([10, 11, 12], [1, 8, 9]),
        unit: "Metric tonne",
        minimumOrder: "One 20 ft container",
        note: "Yellow and white. Export availability depends on domestic policy in the producing country and can change at short notice.",
      },
      {
        name: "Egusi melon seed",
        origins: ["Nigeria"],
        calendar: months([11, 12], [10, 1]),
        unit: "Metric tonne",
        minimumOrder: "5 tonnes",
        note: "Shelled and cleaned. Sold mainly into the West African diaspora trade in the United Kingdom.",
      },
    ],
  },
  {
    slug: "oils-and-fats",
    name: "Oils and fats",
    summary: "Palm oil, shea butter and groundnut oil, available through the year.",
    intro:
      "Oils trade continuously rather than seasonally, with pricing that follows the underlying crop. For the United Kingdom market, the two questions that decide whether a supplier is workable are refinement level and whether the material can be certified sustainable.",
    specify: [
      "Crude, semi refined or fully refined",
      "Free fatty acid content and moisture",
      "Packaging: drums, jerry cans, flexitank or IBC",
      "Sustainability certification where required",
      "Whether food grade or cosmetic grade",
    ],
    products: [
      {
        name: "Crude palm oil",
        origins: ["Nigeria", "Ghana", "Cameroon"],
        calendar: months([2, 3, 4, 5], ALL.filter((m) => ![2, 3, 4, 5].includes(m))),
        unit: "Metric tonne",
        minimumOrder: "One flexitank, about 20 tonnes",
        note: "Peak production runs February to May. Free fatty acid content is the number that decides the price.",
      },
      {
        name: "Shea butter",
        origins: ["Nigeria", "Ghana"],
        calendar: months([], ALL),
        unit: "Metric tonne",
        minimumOrder: "1 tonne",
        note: "Grade A unrefined for cosmetics, refined for food. State which before asking for a price, they are different products.",
      },
      {
        name: "Groundnut oil",
        origins: ["Nigeria"],
        calendar: months([12, 1, 2], ALL.filter((m) => ![12, 1, 2].includes(m))),
        unit: "Metric tonne",
        minimumOrder: "5 tonnes",
        note: "Cold pressed and refined. Aflatoxin testing applies to the oil as well as the nut.",
      },
      {
        name: "Coconut oil",
        origins: ["Nigeria", "Ghana", "Tanzania"],
        calendar: months([], ALL),
        unit: "Metric tonne",
        minimumOrder: "1 tonne",
        note: "Virgin and refined. Smaller volumes than the Asian trade, usually sold on quality rather than price.",
      },
    ],
  },
  {
    slug: "processed-foods",
    name: "Processed foods",
    summary:
      "Cassava flour, dried fish, packaged staples and other shelf stable products.",
    intro:
      "This category serves the United Kingdom diaspora retail trade and the growing set of mainstream retailers stocking West and East African staples. Order sizes are smaller, turnover is faster, and labelling is the thing that most often stops a shipment. Get the label right before the first order rather than after.",
    specify: [
      "Retail pack size and case configuration",
      "Shelf life remaining on arrival",
      "United Kingdom compliant labelling, including allergens and nutrition",
      "Barcode and whether own label is possible",
      "Whether the producer holds a food safety certification",
    ],
    products: [
      {
        name: "Garri and cassava flour",
        origins: ["Nigeria", "Ghana"],
        calendar: months([], ALL),
        unit: "Carton",
        minimumOrder: "One pallet",
        note: "White and yellow garri, plus fufu and pounded yam flour. Moisture control decides shelf life.",
      },
      {
        name: "Dried and smoked fish",
        origins: ["Nigeria", "Ghana"],
        calendar: months([], ALL),
        unit: "Carton",
        minimumOrder: "One pallet",
        note: "Requires an approved establishment number for import into the United Kingdom. Confirm this before ordering.",
      },
      {
        name: "Palm and pepper soup seasoning",
        origins: ["Nigeria", "Ghana"],
        calendar: months([], ALL),
        unit: "Carton",
        minimumOrder: "One pallet",
        note: "Blended and packed at origin. Own label is usually possible at modest volumes.",
      },
      {
        name: "Dried plantain and snack products",
        origins: ["Nigeria", "Ghana", "Uganda"],
        calendar: months([], ALL),
        unit: "Carton",
        minimumOrder: "One pallet",
        note: "Growing category in United Kingdom retail. Packaging quality varies widely, so ask for physical samples.",
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
  { country: "Nigeria", region: "West Africa", knownFor: "Sesame, cashew, ginger, hibiscus, sorghum, palm oil" },
  { country: "Ghana", region: "West Africa", knownFor: "Cocoa, shea, pineapple, mango, cassava products" },
  { country: "Cote d Ivoire", region: "West Africa", knownFor: "Cocoa, cashew, pineapple, mango" },
  { country: "Cameroon", region: "Central Africa", knownFor: "Cocoa, palm oil, pepper" },
  { country: "Kenya", region: "East Africa", knownFor: "Avocado, fine beans, coffee, mango" },
  { country: "Uganda", region: "East Africa", knownFor: "Robusta coffee, dried fruit, sesame" },
  { country: "Tanzania", region: "East Africa", knownFor: "Cashew, sesame, avocado, coffee" },
  { country: "Ethiopia", region: "East Africa", knownFor: "Arabica coffee, sesame, pulses" },
  { country: "Rwanda", region: "East Africa", knownFor: "Speciality coffee, chilli, horticulture" },
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
