/**
 * Freight pricing.
 *
 * The one thing to understand before reading any of this: freight is not
 * charged on what a shipment weighs. It is charged on the greater of what it
 * weighs and the space it takes up. Carriers sell volume, not mass, because
 * an aircraft fills up long before it gets heavy.
 *
 * That matters more here than on most platforms. Dried hibiscus, shea, leaf
 * and flower products are light and bulky, so the volumetric figure wins on
 * most of what AfriLynq sells. Quoting on actual weight would undercharge
 * those orders by a wide margin, and the error grows with the order.
 *
 * Everything in this file is pure. No database, no network, no clock except
 * what is handed in. The caller loads the rate card, calls `quoteFreight`,
 * and writes the result to `freight_quotes`, where it is frozen.
 */

export type FreightMode = "air" | "sea" | "road";

/** 1 m3 of sea cargo is rated as 1 tonne, whichever of the two is greater. */
const SEA_KG_PER_M3 = 1000;

/** A metre cubed is a million centimetres cubed. Spelled out so the
 *  divisor arithmetic below reads in the units carriers actually quote. */
const CM3_PER_M3 = 1_000_000;

export type PackSpec = {
  unitsPerPack: number | null;
  packGrossWeightKg: number | null;
  packLengthCm: number | null;
  packWidthCm: number | null;
  packHeightCm: number | null;
};

export type OrderLine = {
  /** Quantity in the product's own sale unit, not in packs. */
  quantity: number;
  pack: PackSpec;
};

export type Measurement = {
  packs: number;
  actualWeightKg: number;
  volumeM3: number;
};

export type RateBreak = {
  breakFromKg: number;
  /** Minor units per kg. Fractional on purpose: 3.825 is an ordinary rate. */
  pricePerKgMinor: number;
};

export type Surcharge = {
  kind: "fuel" | "security" | "handling" | "other";
  basis: "percent" | "per_kg" | "flat";
  value: number;
};

export type RateCard = {
  rateCardId: string;
  currency: string;
  minimumChargeMinor: number;
  breaks: RateBreak[];
  validFrom: string;
  validTo: string;
};

export type CarrierForQuote = {
  carrierId: string;
  carrierName: string;
  laneId: string;
  mode: FreightMode;
  volumetricDivisor: number;
  commissionRate: number;
  chilled: boolean;
  transitDaysMax: number | null;
  rateCard: RateCard;
  surcharges: Surcharge[];
};

export type FreightQuote = {
  carrierId: string;
  carrierName: string;
  laneId: string;
  rateCardId: string;
  currency: string;

  packs: number;
  actualWeightKg: number;
  volumeM3: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  volumetricDivisor: number;

  /** The break the rate was taken from, after the uplift rule below. */
  appliedBreakKg: number;
  appliedRatePerKgMinor: number;
  /** What the base was actually multiplied by. Differs from chargeable
   *  weight when it was cheaper to be billed as a heavier consignment. */
  ratedWeightKg: number;

  baseMinor: number;
  surchargeMinor: number;
  totalMinor: number;
  minimumApplied: boolean;
  surchargeDetail: { kind: string; basis: string; value: number; amountMinor: number }[];

  commissionRate: number;
  commissionMinor: number;

  transitDaysMax: number | null;
};

/* -------------------------------------------------------------------------
 * Measuring the goods
 * ---------------------------------------------------------------------- */

/**
 * How many packs a quantity needs. Always rounded up, because half a sack
 * still travels as a sack and the carrier still charges for its volume.
 */
export function packsFor(quantity: number, unitsPerPack: number): number {
  if (!(unitsPerPack > 0)) throw new Error("unitsPerPack must be positive");
  return Math.ceil(quantity / unitsPerPack);
}

/** True when a product carries everything needed to be quoted for freight. */
export function isPackComplete(p: PackSpec): boolean {
  return (
    p.unitsPerPack != null &&
    p.packGrossWeightKg != null &&
    p.packLengthCm != null &&
    p.packWidthCm != null &&
    p.packHeightCm != null
  );
}

/**
 * Turn order lines into one weight and one volume.
 *
 * Throws rather than guessing when a product has not been measured. A quote
 * built on an assumed pack size is worse than no quote: it looks authoritative
 * and it is wrong, and the gap only shows up on the carrier's invoice.
 */
export function measure(lines: OrderLine[]): Measurement {
  let packs = 0;
  let actualWeightKg = 0;
  let volumeCm3 = 0;

  for (const line of lines) {
    const p = line.pack;
    if (!isPackComplete(p)) {
      throw new Error("Cannot quote freight: a product has no packing details");
    }
    const n = packsFor(line.quantity, p.unitsPerPack!);
    packs += n;
    actualWeightKg += n * p.packGrossWeightKg!;
    volumeCm3 += n * p.packLengthCm! * p.packWidthCm! * p.packHeightCm!;
  }

  return {
    packs,
    actualWeightKg: round(actualWeightKg, 3),
    volumeM3: round(volumeCm3 / CM3_PER_M3, 4),
  };
}

/* -------------------------------------------------------------------------
 * Chargeable weight
 * ---------------------------------------------------------------------- */

/**
 * Volumetric weight in kg.
 *
 * Air uses the carrier's divisor against centimetres cubed; 6000 is the IATA
 * standard and some carriers use 5000, which bills the same bulky load about
 * twenty percent higher. Sea rates a cubic metre as a tonne instead.
 */
export function volumetricWeightKg(
  volumeM3: number,
  mode: FreightMode,
  divisor: number,
): number {
  if (mode === "sea") return round(volumeM3 * SEA_KG_PER_M3, 3);
  if (!(divisor > 0)) throw new Error("volumetric divisor must be positive");
  return round((volumeM3 * CM3_PER_M3) / divisor, 3);
}

/** The greater of the two. This is the whole rule, and it is the one the
 *  meeting note missed. */
export function chargeableWeightKg(actualKg: number, volumetricKg: number): number {
  return Math.max(actualKg, volumetricKg);
}

/* -------------------------------------------------------------------------
 * Applying the rate card
 * ---------------------------------------------------------------------- */

/**
 * Pick the rate, applying the uplift rule.
 *
 * Rates fall in steps as the consignment gets heavier, which creates a gap
 * just below each step where it is cheaper to be billed as though you had
 * sent more. 95 kg at the 45 kg rate can cost more than 100 kg at the 100 kg
 * rate. Forwarders do this for their customers as a matter of course, and a
 * platform that does not is quietly overcharging every order that lands near
 * a break.
 *
 * Returns the cheapest combination of break and rated weight.
 */
export function applyBreaks(
  breaks: RateBreak[],
  chargeableKg: number,
): { breakFromKg: number; pricePerKgMinor: number; ratedWeightKg: number; baseMinor: number } {
  if (breaks.length === 0) throw new Error("rate card has no breaks");

  const sorted = [...breaks].sort((a, b) => a.breakFromKg - b.breakFromKg);

  // The band the consignment genuinely falls in.
  let applicable = sorted[0];
  for (const b of sorted) {
    if (chargeableKg >= b.breakFromKg) applicable = b;
  }

  let best = {
    breakFromKg: applicable.breakFromKg,
    pricePerKgMinor: applicable.pricePerKgMinor,
    ratedWeightKg: chargeableKg,
    baseMinor: chargeableKg * applicable.pricePerKgMinor,
  };

  // Every heavier band, rated at its own minimum weight.
  for (const b of sorted) {
    if (b.breakFromKg <= chargeableKg) continue;
    const cost = b.breakFromKg * b.pricePerKgMinor;
    if (cost < best.baseMinor) {
      best = {
        breakFromKg: b.breakFromKg,
        pricePerKgMinor: b.pricePerKgMinor,
        ratedWeightKg: b.breakFromKg,
        baseMinor: cost,
      };
    }
  }

  return { ...best, baseMinor: Math.round(best.baseMinor) };
}

/**
 * Surcharges, in a fixed order so the arithmetic is reproducible.
 *
 * Percent surcharges are taken on the base freight only, never compounded on
 * each other, which is how carriers actually bill them.
 */
export function applySurcharges(
  surcharges: Surcharge[],
  baseMinor: number,
  chargeableKg: number,
): { totalMinor: number; detail: FreightQuote["surchargeDetail"] } {
  const detail: FreightQuote["surchargeDetail"] = [];
  let total = 0;

  for (const s of surcharges) {
    let amount = 0;
    if (s.basis === "percent") amount = (baseMinor * s.value) / 100;
    else if (s.basis === "per_kg") amount = chargeableKg * s.value;
    else amount = s.value;

    amount = Math.round(amount);
    total += amount;
    detail.push({ kind: s.kind, basis: s.basis, value: s.value, amountMinor: amount });
  }

  return { totalMinor: total, detail };
}

/* -------------------------------------------------------------------------
 * The quote
 * ---------------------------------------------------------------------- */

export function quoteFreight(
  carrier: CarrierForQuote,
  measurement: Measurement,
): FreightQuote {
  const volumetric = volumetricWeightKg(
    measurement.volumeM3,
    carrier.mode,
    carrier.volumetricDivisor,
  );
  const chargeable = chargeableWeightKg(measurement.actualWeightKg, volumetric);

  const rated = applyBreaks(carrier.rateCard.breaks, chargeable);
  const sur = applySurcharges(carrier.surcharges, rated.baseMinor, chargeable);

  let base = rated.baseMinor;
  let minimumApplied = false;
  if (base + sur.totalMinor < carrier.rateCard.minimumChargeMinor) {
    base = carrier.rateCard.minimumChargeMinor - sur.totalMinor;
    minimumApplied = true;
  }

  const total = base + sur.totalMinor;

  return {
    carrierId: carrier.carrierId,
    carrierName: carrier.carrierName,
    laneId: carrier.laneId,
    rateCardId: carrier.rateCard.rateCardId,
    currency: carrier.rateCard.currency,

    packs: measurement.packs,
    actualWeightKg: measurement.actualWeightKg,
    volumeM3: measurement.volumeM3,
    volumetricWeightKg: volumetric,
    chargeableWeightKg: chargeable,
    volumetricDivisor: carrier.volumetricDivisor,

    appliedBreakKg: rated.breakFromKg,
    appliedRatePerKgMinor: rated.pricePerKgMinor,
    ratedWeightKg: rated.ratedWeightKg,

    baseMinor: base,
    surchargeMinor: sur.totalMinor,
    totalMinor: total,
    minimumApplied,
    surchargeDetail: sur.detail,

    commissionRate: carrier.commissionRate,
    commissionMinor: Math.round((total * carrier.commissionRate) / 100),

    transitDaysMax: carrier.transitDaysMax,
  };
}

/* -------------------------------------------------------------------------
 * Choosing a carrier
 * ---------------------------------------------------------------------- */

/**
 * Quote everyone who can do the job, cheapest first.
 *
 * `requiresChilled` is a hard filter rather than a preference: a lane without
 * refrigeration cannot carry perishable goods at any price, and sorting it
 * to the bottom would eventually let it win on a day when nothing else
 * covered the route.
 */
export function quoteAll(
  carriers: CarrierForQuote[],
  measurement: Measurement,
  opts: { requiresChilled?: boolean } = {},
): FreightQuote[] {
  return carriers
    .filter((c) => (opts.requiresChilled ? c.chilled : true))
    .map((c) => quoteFreight(c, measurement))
    .sort((a, b) => {
      if (a.totalMinor !== b.totalMinor) return a.totalMinor - b.totalMinor;
      // Same money, so prefer the one that arrives sooner. A null transit
      // time sorts last: an unknown is not a selling point.
      const at = a.transitDaysMax ?? Number.MAX_SAFE_INTEGER;
      const bt = b.transitDaysMax ?? Number.MAX_SAFE_INTEGER;
      return at - bt;
    });
}

/** The automatic pick from the meeting: cheapest that can actually do it. */
export function chooseCarrier(quotes: FreightQuote[]): FreightQuote | null {
  return quotes.length > 0 ? quotes[0] : null;
}

/* -------------------------------------------------------------------------
 * Reconciliation
 * ---------------------------------------------------------------------- */

export type VarianceVerdict = "within_tolerance" | "review" | "no_invoice";

/**
 * Whether a carrier's invoice is far enough from the quote to need a human.
 * Absorbing small differences keeps the buyer's checkout price honest; the
 * tolerance is where "absorb it" stops and "go and look" starts.
 */
export function varianceVerdict(
  quotedMinor: number,
  invoicedMinor: number | null,
  tolerancePercent: number,
): { verdict: VarianceVerdict; variancePercent: number | null } {
  if (invoicedMinor == null) return { verdict: "no_invoice", variancePercent: null };
  if (quotedMinor === 0) return { verdict: "review", variancePercent: null };

  const pct = ((invoicedMinor - quotedMinor) / quotedMinor) * 100;
  return {
    verdict: Math.abs(pct) <= tolerancePercent ? "within_tolerance" : "review",
    variancePercent: round(pct, 2),
  };
}

/* ---------------------------------------------------------------------- */

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
