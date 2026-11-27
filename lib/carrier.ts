/**
 * The carrier side of the platform.
 *
 * A logistics company signs in at a URL we hand them, sees the jobs assigned
 * to their own company, agrees a price with us and reports movement. Nothing
 * links to it from the site, but that is tidiness rather than security: the
 * protection is this sign-in plus the row level policies behind it.
 *
 * Everything here reads through the signed in user's own session, never the
 * service key. If a query returns nothing it is because the database decided
 * this account may not see it, which is exactly the behaviour we want.
 */

import { sessionClient, isConfigured } from "@/lib/supabase-server";

export interface CarrierAccount {
  carrierId: string;
  carrierName: string;
  userId: string;
  email: string | null;
  roleTitle: string | null;
}

export interface CarrierJob {
  shipment_id: string;
  reference: string;
  status: string;
  tracking_reference: string | null;
  service: string | null;
  pieces: number | null;
  gross_weight_kg: number | null;
  volume_m3: number | null;
  declared_value_minor: number | null;
  declared_currency: string | null;
  origin_country_code: string | null;
  destination_country_code: string | null;
  origin_address: string | null;
  destination_address: string | null;
  incoterm: string | null;
  booked_at: string;
  collected_at: string | null;
  delivered_at: string | null;
  expected_delivery: string | null;
  freight_agreed_minor: number | null;
  freight_agreed_currency: string | null;
  freight_agreed_at: string | null;
  awaiting_price: boolean;
}

export interface Proposal {
  id: string;
  shipment_id: string;
  parent_id: string | null;
  proposed_by: "carrier" | "admin";
  amount_minor: number;
  currency: string;
  chargeable_weight_kg: number | null;
  note: string | null;
  status: string;
  created_at: string;
}

export interface CarrierEvent {
  id: string;
  status: string;
  description: string | null;
  location: string | null;
  occurred_at: string;
  approval_state: string;
  review_note: string | null;
}

/**
 * Who is signed in, if they are a carrier at all.
 *
 * Returns null for a signed out visitor and equally for a perfectly valid
 * buyer or supplier who has wandered onto this URL. The portal cannot tell
 * them apart and should not try: both get sent to the sign-in page.
 */
export async function currentCarrier(): Promise<CarrierAccount | null> {
  if (!isConfigured()) return null;
  const supabase = await sessionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return null;

  const { data } = await supabase
    .from("carrier_users")
    .select("carrier_id, role_title, carrier:carrier_id ( id, name, active )")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!data) return null;

  const row = data as unknown as {
    carrier_id: string;
    role_title: string | null;
    carrier: { id: string; name: string; active: boolean }
      | { id: string; name: string; active: boolean }[]
      | null;
  };

  // Supabase types an embedded one-to-one as an array. It is a single row
  // here because carrier_id is a foreign key.
  const carrier = Array.isArray(row.carrier) ? row.carrier[0] : row.carrier;
  if (!carrier || !carrier.active) return null;

  return {
    carrierId: carrier.id,
    carrierName: carrier.name,
    userId: user.id,
    email: user.email ?? null,
    roleTitle: row.role_title,
  };
}

/**
 * Every job assigned to this carrier.
 *
 * Reads carrier_jobs, a view that both filters to the signed in carrier and
 * narrows the columns. A haulier gets addresses, weights, pieces and the
 * declared value. They never see the order, so they never see what the buyer
 * paid the supplier or who the buyer is as a company.
 */
export async function carrierJobs(): Promise<CarrierJob[]> {
  if (!isConfigured()) return [];
  const supabase = await sessionClient();

  const { data } = await supabase
    .from("carrier_jobs")
    .select("*")
    .order("booked_at", { ascending: false });

  return (data as unknown as CarrierJob[]) ?? [];
}

export async function carrierJob(shipmentId: string): Promise<CarrierJob | null> {
  if (!isConfigured()) return null;
  const supabase = await sessionClient();

  const { data } = await supabase
    .from("carrier_jobs")
    .select("*")
    .eq("shipment_id", shipmentId)
    .maybeSingle();

  return (data as unknown as CarrierJob | null) ?? null;
}

/** The price conversation on one job, oldest first so it reads as a thread. */
export async function proposalsFor(shipmentId: string): Promise<Proposal[]> {
  if (!isConfigured()) return [];
  const supabase = await sessionClient();

  const { data } = await supabase
    .from("freight_proposals")
    .select(
      "id, shipment_id, parent_id, proposed_by, amount_minor, currency, " +
        "chargeable_weight_kg, note, status, created_at"
    )
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: true });

  return (data as unknown as Proposal[]) ?? [];
}

/**
 * What this carrier has reported on one job.
 *
 * Reads the table rather than the public view on purpose. A carrier should
 * see that their own "delivered" is sitting with us rather than wondering
 * why nothing happened, so pending events are shown here with their state.
 */
export async function carrierEvents(shipmentId: string): Promise<CarrierEvent[]> {
  if (!isConfigured()) return [];
  const supabase = await sessionClient();

  const { data } = await supabase
    .from("shipment_events")
    .select("id, status, description, location, occurred_at, approval_state, review_note")
    .eq("shipment_id", shipmentId)
    .order("occurred_at", { ascending: false })
    .limit(30);

  return (data as unknown as CarrierEvent[]) ?? [];
}

/* ------------------------------------------------------------------ */

/** The live offer, if the conversation is still going. */
export function openProposal(list: Proposal[]): Proposal | null {
  return list.find((p) => p.status === "open") ?? null;
}

export function acceptedProposal(list: Proposal[]): Proposal | null {
  return list.find((p) => p.status === "accepted") ?? null;
}

/**
 * Whose turn it is.
 *
 * An open offer from us is waiting on the carrier; one from them is waiting
 * on us. Nothing open at all means either it has never been priced or the
 * price is settled.
 */
export function waitingOn(list: Proposal[]): "carrier" | "afrilynq" | "nobody" {
  const open = openProposal(list);
  if (!open) return acceptedProposal(list) ? "nobody" : "carrier";
  return open.proposed_by === "admin" ? "carrier" : "afrilynq";
}

/**
 * The statuses a carrier may report, in the order a job actually travels.
 *
 * "Booked" is missing deliberately: that is us assigning the job, not the
 * carrier reporting anything. Cancelled is missing too, because a carrier
 * walking away from a paid job is a conversation, not a dropdown.
 */
export const CARRIER_REPORTABLE: { value: string; label: string; held: boolean }[] = [
  { value: "collected", label: "Picked up from the supplier", held: false },
  { value: "in_transit", label: "On its way", held: false },
  { value: "customs", label: "Clearing customs", held: false },
  { value: "out_for_delivery", label: "Out for delivery", held: false },
  { value: "delivered", label: "Delivered", held: true },
  { value: "exception", label: "There is a problem", held: true },
];

export function isHeldStatus(status: string): boolean {
  return CARRIER_REPORTABLE.find((s) => s.value === status)?.held ?? false;
}
