/**
 * The shipment status model.
 *
 * Six states plus two endings, and they are AfriLynq's rather than any
 * carrier's. DHL reports "IN TRANSIT" and a Lagos freight forwarder
 * telephones to say the lorry left this morning; both arrive here as
 * in_transit. A model that mirrored one carrier's vocabulary would need
 * rewriting the day a second carrier signed.
 *
 * Deliberately short. Carriers publish dozens of scan codes and almost
 * none of them change what anybody does. These are the ones a buyer acts
 * on and a supplier is paid against.
 */

export type ShipmentStatus =
  | "booked"
  | "collected"
  | "in_transit"
  | "customs"
  | "out_for_delivery"
  | "delivered"
  | "exception"
  | "cancelled";

export const SHIPMENT_STATUS: Record<
  ShipmentStatus,
  { label: string; buyer: string; tone: string; step: number }
> = {
  booked: {
    label: "Booked",
    buyer: "Collection arranged",
    tone: "bg-white/8 text-white/55 ring-white/10",
    step: 1,
  },
  collected: {
    label: "Collected",
    buyer: "Picked up from the supplier",
    tone: "bg-[#3B82F6]/15 text-[#7DA9F8] ring-[#3B82F6]/25",
    step: 2,
  },
  in_transit: {
    label: "In transit",
    buyer: "On its way",
    tone: "bg-[#3B82F6]/15 text-[#7DA9F8] ring-[#3B82F6]/25",
    step: 3,
  },
  customs: {
    label: "At customs",
    buyer: "Clearing customs",
    tone: "bg-gold/15 text-gold ring-gold/25",
    step: 4,
  },
  out_for_delivery: {
    label: "Out for delivery",
    buyer: "Out for delivery today",
    tone: "bg-[#3B82F6]/15 text-[#7DA9F8] ring-[#3B82F6]/25",
    step: 5,
  },
  delivered: {
    label: "Delivered",
    buyer: "Delivered",
    tone: "bg-[#2FA36B]/15 text-[#4CC98D] ring-[#2FA36B]/25",
    step: 6,
  },
  exception: {
    label: "Problem",
    buyer: "There is a problem",
    tone: "bg-[#C2453F]/15 text-[#E58B85] ring-[#C2453F]/25",
    step: 0,
  },
  cancelled: {
    label: "Cancelled",
    buyer: "Cancelled",
    tone: "bg-white/8 text-white/40 ring-white/10",
    step: 0,
  },
};

/** The ordered run a normal shipment makes, for a progress display. */
export const SHIPMENT_PATH: ShipmentStatus[] = [
  "booked",
  "collected",
  "in_transit",
  "customs",
  "out_for_delivery",
  "delivered",
];

/**
 * What a shipment may become next.
 *
 * Forward along the path, and sideways into exception or cancelled from
 * anywhere that has not finished. A shipment can also come back from an
 * exception, because most exceptions are resolved rather than fatal: a
 * document was missing, it was supplied, the load moved on.
 */
export function nextStatuses(current: string): ShipmentStatus[] {
  if (current === "delivered" || current === "cancelled") return [];

  if (current === "exception") {
    return ["in_transit", "customs", "out_for_delivery", "delivered", "cancelled"];
  }

  const index = SHIPMENT_PATH.indexOf(current as ShipmentStatus);
  const forward = index >= 0 ? SHIPMENT_PATH.slice(index + 1) : [];
  return [...forward, "exception", "cancelled"];
}

export function canMoveTo(from: string, to: string): boolean {
  return nextStatuses(from).includes(to as ShipmentStatus);
}

/**
 * The paperwork, and which of it actually stops a load.
 *
 * The required set is not a matter of taste. Food and plant products
 * entering Great Britain need a phytosanitary certificate issued by the
 * exporting country's plant health authority, and a commercial invoice
 * and packing list for customs. A certificate of origin is what lets a
 * buyer claim a preferential tariff where one exists, so it is not
 * strictly required to move but is usually worth more than it costs.
 *
 * This is a working checklist, not legal advice, and it is the reason
 * the list is here in one place rather than spread across screens.
 */
export const DOCUMENT_KIND: Record<
  string,
  { label: string; whatItIs: string; blocking: boolean }
> = {
  commercial_invoice: {
    label: "Commercial invoice",
    whatItIs: "What was sold, to whom, for how much. Customs value both ends.",
    blocking: true,
  },
  packing_list: {
    label: "Packing list",
    whatItIs: "What is in each carton, with weights. Checked against the load.",
    blocking: true,
  },
  phytosanitary_certificate: {
    label: "Phytosanitary certificate",
    whatItIs:
      "Issued by the exporting country's plant health authority. Agricultural goods do not enter the UK without one.",
    blocking: true,
  },
  certificate_of_origin: {
    label: "Certificate of origin",
    whatItIs:
      "Where the goods were grown. Lets the buyer claim a preferential tariff where one applies.",
    blocking: false,
  },
  bill_of_lading: {
    label: "Bill of lading",
    whatItIs: "The sea freight contract and title to the goods.",
    blocking: false,
  },
  air_waybill: {
    label: "Air waybill",
    whatItIs: "The air freight equivalent. Not title, unlike a bill of lading.",
    blocking: false,
  },
  export_declaration: {
    label: "Export declaration",
    whatItIs: "Filed with the exporting country's customs.",
    blocking: false,
  },
  import_declaration: {
    label: "Import declaration",
    whatItIs: "Filed with HMRC on arrival.",
    blocking: false,
  },
  insurance_certificate: {
    label: "Insurance certificate",
    whatItIs: "Cover for the load in transit.",
    blocking: false,
  },
  other: { label: "Other", whatItIs: "Anything else the carrier or border asks for.", blocking: false },
};

/** The ones that should exist on any agricultural shipment to the UK. */
export const EXPECTED_DOCUMENTS = [
  "commercial_invoice",
  "packing_list",
  "phytosanitary_certificate",
  "certificate_of_origin",
] as const;

/**
 * What is missing before this load can reasonably move.
 *
 * Only the blocking ones count. A missing certificate of origin costs the
 * buyer money and does not stop the lorry; a missing phytosanitary
 * certificate stops it at the border, which is a different conversation
 * and should read differently on the screen.
 */
export function blockingDocumentsMissing(present: readonly string[]): string[] {
  const have = new Set(present);
  return EXPECTED_DOCUMENTS.filter(
    (kind) => DOCUMENT_KIND[kind]?.blocking && !have.has(kind)
  );
}

/** Weight as people write it, not as a float with eleven decimal places. */
export function formatWeight(kg: number | null | undefined): string {
  if (kg === null || kg === undefined) return "";
  if (kg >= 1000) return `${(kg / 1000).toLocaleString("en-GB", { maximumFractionDigits: 2 })} t`;
  return `${kg.toLocaleString("en-GB", { maximumFractionDigits: 1 })} kg`;
}

/** A carrier's lane coverage, in a sentence. */
export function describeLanes(
  origins: string[] | null,
  destinations: string[] | null
): string {
  const from = origins?.length ? origins.join(", ") : "anywhere";
  const to = destinations?.length ? destinations.join(", ") : "anywhere";
  return `${from} to ${to}`;
}

/**
 * Whether a carrier can plausibly take this load.
 *
 * Advisory, not enforced. A carrier with no lanes recorded is treated as
 * able to go anywhere, because an empty list means nobody has asked them
 * yet rather than that they refuse all work.
 */
export function carrierCovers(
  carrier: { origin_countries: string[] | null; destination_countries: string[] | null },
  origin: string | null,
  destination: string | null
): boolean {
  const originOk =
    !carrier.origin_countries?.length || !origin ||
    carrier.origin_countries.includes(origin);
  const destOk =
    !carrier.destination_countries?.length || !destination ||
    carrier.destination_countries.includes(destination);
  return originOk && destOk;
}
