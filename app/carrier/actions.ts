"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sessionClient } from "@/lib/supabase-server";
import { currentCarrier, isHeldStatus } from "@/lib/carrier";

/**
 * What a carrier is allowed to do.
 *
 * Every write here goes through a database function rather than a table
 * write, and those functions check the row belongs to the caller before
 * doing anything. That is not belt and braces: a carrier who could write
 * shipment_events directly could record their own delivery, and a delivery
 * starts the seven day clock that pays the supplier.
 *
 * So these actions are thin. They collect a form, call the function, and
 * let the database refuse anything it should refuse.
 */

const back = (id: string, code: string) =>
  redirect(`/carrier/${id}?done=${code}`);

/** Convert "1,880.50" or "1880" into minor units, or null if unusable. */
function toMinor(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const major = Number(cleaned);
  if (!Number.isFinite(major) || major < 0) return null;
  return Math.round(major * 100);
}

/** Send a price, or answer ours. */
export async function sendPrice(shipmentId: string, formData: FormData): Promise<void> {
  const carrier = await currentCarrier();
  if (!carrier) redirect("/carrier/login");

  const amount = toMinor(formData.get("amount"));
  if (amount === null) back(shipmentId, "badprice");

  const currency = String(formData.get("currency") || "GBP").toUpperCase();
  const weightRaw = String(formData.get("weight") || "").trim();
  const weight = weightRaw ? Number(weightRaw) : null;
  const note = String(formData.get("note") || "").trim() || null;
  const parentId = String(formData.get("parent_id") || "").trim() || null;

  const supabase = await sessionClient();
  const { error } = await supabase.rpc("carrier_submit_proposal", {
    p_shipment_id: shipmentId,
    p_amount_minor: amount,
    p_currency: currency,
    p_chargeable_weight_kg: Number.isFinite(weight as number) ? weight : null,
    p_note: note,
    p_parent_id: parentId,
  });

  if (error) {
    console.error("carrier_submit_proposal", error.message);
    back(shipmentId, "pricefailed");
  }


  revalidatePath(`/carrier/${shipmentId}`);
  revalidatePath("/carrier");
  back(shipmentId, "pricesent");
}

/** Accept the figure AfriLynq last offered. */
export async function acceptOurPrice(
  shipmentId: string,
  proposalId: string
): Promise<void> {
  const carrier = await currentCarrier();
  if (!carrier) redirect("/carrier/login");

  // A carrier accepting our number is recorded as them proposing it and us
  // taking it, because admin_respond_to_proposal is the only thing that may
  // write an agreed price and it is admin only. Submitting the same figure
  // back leaves the decision where it belongs: with us.
  const supabase = await sessionClient();
  const { data: row } = await supabase
    .from("freight_proposals")
    .select("amount_minor, currency")
    .eq("id", proposalId)
    .maybeSingle();

  const offer = row as { amount_minor: number; currency: string } | null;
  if (!offer) back(shipmentId, "pricefailed");

  const { error } = await supabase.rpc("carrier_submit_proposal", {
    p_shipment_id: shipmentId,
    p_amount_minor: offer!.amount_minor,
    p_currency: offer!.currency,
    p_chargeable_weight_kg: null,
    p_note: "Accepted your figure.",
    p_parent_id: proposalId,
  });

  if (error) {
    console.error("carrier accept", error.message);
    back(shipmentId, "pricefailed");
  }


  revalidatePath(`/carrier/${shipmentId}`);
  back(shipmentId, "priceaccepted");
}

/** Report movement. */
export async function postUpdate(shipmentId: string, formData: FormData): Promise<void> {
  const carrier = await currentCarrier();
  if (!carrier) redirect("/carrier/login");

  const status = String(formData.get("status") || "").trim();
  if (!status) back(shipmentId, "badstatus");

  const description = String(formData.get("description") || "").trim() || null;
  const location = String(formData.get("location") || "").trim() || null;
  const occurredRaw = String(formData.get("occurred_at") || "").trim();

  // A carrier posting a batch at midnight is reporting things that happened
  // during the day, so the time they give wins over the time we received it.
  const occurred = occurredRaw ? new Date(occurredRaw) : new Date();
  const occurredAt = Number.isNaN(occurred.getTime())
    ? new Date().toISOString()
    : occurred.toISOString();

  const supabase = await sessionClient();
  const { error } = await supabase.rpc("carrier_record_event", {
    p_shipment_id: shipmentId,
    p_status: status,
    p_description: description,
    p_location: location,
    p_occurred_at: occurredAt,
  });

  if (error) {
    console.error("carrier_record_event", error.message);
    back(shipmentId, "updatefailed");
  }

  if (isHeldStatus(status)) {
  }

  revalidatePath(`/carrier/${shipmentId}`);
  revalidatePath("/carrier");
  back(shipmentId, isHeldStatus(status) ? "updateheld" : "updateposted");
}
