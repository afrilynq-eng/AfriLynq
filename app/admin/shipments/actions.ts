"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import { canMoveTo, type ShipmentStatus } from "@/lib/shipments";
import { notifyBuyer, notifyCompany } from "@/lib/notify";

/**
 * Moving goods.
 *
 * Writes go through the service key because every shipment table refuses
 * direct writes from a signed in user. That is deliberate rather than
 * lazy: a supplier who could write a shipment event could record their
 * own delivery, and a delivery releases their money.
 *
 * So the gate is requireAdmin here, and every change writes an audit_log
 * row naming who made it.
 */

const back = (code: string, id?: string) =>
  redirect(`/admin/shipments?done=${code}${id ? `&id=${id}` : ""}`);

/** Book a shipment against an order. */
export async function bookShipment(orderId: string, formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const svc = serviceClient();

  const { data: orderRow } = await svc
    .from("orders")
    .select(
      "id, reference, status, currency, total_minor, incoterm, " +
        "delivery_country_code, delivery_address, supplier_company_id, " +
        "buyer_company_id, buyer_profile_id"
    )
    .eq("id", orderId)
    .maybeSingle();

  const order = orderRow as unknown as {
    id: string;
    reference: string;
    status: string;
    currency: string;
    total_minor: number;
    incoterm: string | null;
    delivery_country_code: string | null;
    delivery_address: string | null;
    supplier_company_id: string;
    buyer_company_id: string | null;
    buyer_profile_id: string | null;
  } | null;

  if (!order) back("notfound");

  // Nothing ships against an order nobody has paid for. That is the whole
  // point of holding the money.
  if (order!.status === "awaiting_payment") back("notpaid");

  // One open shipment per order. A second is either a mistake or a part
  // shipment, and a part shipment is a decision somebody should make
  // deliberately rather than by pressing the button twice.
  const { data: existing } = await svc
    .from("shipments")
    .select("id")
    .eq("order_id", orderId)
    .not("status", "in", "(delivered,cancelled)");

  if (((existing ?? []) as { id: string }[]).length > 0) back("alreadybooked");

  const carrierId = String(formData.get("carrier_id") ?? "").trim();
  if (!carrierId) back("nocarrier");

  const number = (name: string) => {
    const raw = String(formData.get(name) ?? "").trim();
    if (!raw) return null;
    const value = Number(raw.replace(/[^0-9.]/g, ""));
    return Number.isFinite(value) && value > 0 ? value : null;
  };

  const { data: created, error } = await svc
    .from("shipments")
    .insert({
      order_id: orderId,
      carrier_id: carrierId,
      tracking_reference: String(formData.get("tracking_reference") ?? "").trim() || null,
      service: String(formData.get("service") ?? "").trim() || null,
      status: "booked",
      pieces: number("pieces"),
      gross_weight_kg: number("gross_weight_kg"),
      // The order's value is what is declared unless somebody says
      // otherwise. Understating it to save duty is not a button we build.
      declared_value_minor: order!.total_minor,
      declared_currency: order!.currency,
      origin_country_code: String(formData.get("origin_country_code") ?? "").trim().toUpperCase() || null,
      destination_country_code: order!.delivery_country_code,
      destination_address: order!.delivery_address,
      incoterm: order!.incoterm,
      expected_delivery: String(formData.get("expected_delivery") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      created_by: admin.id,
    })
    .select("id, reference")
    .maybeSingle();

  if (error || !created) {
    console.error("[shipments] booking failed", error);
    back("error");
  }

  const shipment = created as unknown as { id: string; reference: string };

  await svc.from("shipment_events").insert({
    shipment_id: shipment.id,
    status: "booked",
    description: "Collection arranged with the carrier",
    source: "admin",
    recorded_by: admin.id,
  });

  await svc.from("audit_log").insert({
    actor_id: admin.id,
    actor_email: admin.email,
    action: "shipment.booked",
    entity_type: "shipment",
    entity_id: shipment.id,
    after_state: { reference: shipment.reference, order: order!.reference },
  });

  await notifyCompany(order!.supplier_company_id, {
    kind: "order_shipped",
    title: `Collection arranged for ${order!.reference}`,
    body:
      `A carrier has been booked to collect order ${order!.reference}.\n\n` +
      "Have the goods packed and the paperwork ready. You will be told when it is collected.",
    linkPath: `/account/orders/${orderId}`,
    linkLabel: "Open the order",
  });

  revalidatePath("/admin/shipments");
  revalidatePath(`/account/orders/${orderId}`);
  back("booked", shipment.id);
}

/**
 * Record what happened to it.
 *
 * The shipment's own status follows the event, so a list screen reads one
 * column instead of a lateral join, and the event table stays the history
 * that answers where a load was on a given Tuesday.
 */
export async function recordEvent(shipmentId: string, formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const status = String(formData.get("status") ?? "").trim() as ShipmentStatus;
  const svc = serviceClient();

  const { data: shipmentRow } = await svc
    .from("shipments")
    .select("id, reference, status, order_id, tracking_reference")
    .eq("id", shipmentId)
    .maybeSingle();

  const shipment = shipmentRow as unknown as {
    id: string;
    reference: string;
    status: string;
    order_id: string;
    tracking_reference: string | null;
  } | null;

  if (!shipment) back("notfound");

  if (!canMoveTo(shipment!.status, status)) {
    back("badstep");
  }

  const occurred = String(formData.get("occurred_at") ?? "").trim();
  const when = occurred ? new Date(occurred).toISOString() : new Date().toISOString();

  await svc.from("shipment_events").insert({
    shipment_id: shipmentId,
    status,
    description: String(formData.get("description") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    occurred_at: when,
    source: "admin",
    recorded_by: admin.id,
  });

  const patch: Record<string, unknown> = { status };
  if (status === "collected") patch.collected_at = when;
  if (status === "delivered") patch.delivered_at = when;

  await svc.from("shipments").update(patch).eq("id", shipmentId);

  await svc.from("audit_log").insert({
    actor_id: admin.id,
    actor_email: admin.email,
    action: `shipment.${status}`,
    entity_type: "shipment",
    entity_id: shipmentId,
    before_state: { status: shipment!.status },
    after_state: { status, reference: shipment!.reference },
  });

  /**
   * The order moves with the shipment, but only forward and only where
   * the order has not already overtaken it. A buyer who has confirmed
   * receipt must not be dragged back to "shipped" by a late carrier scan.
   */
  if (status === "collected") {
    await svc
      .from("orders")
      .update({ status: "shipped", shipped_at: when })
      .eq("id", shipment!.order_id)
      .in("status", ["confirmed", "in_production"]);
  }

  if (status === "in_transit") {
    await svc
      .from("orders")
      .update({ status: "in_transit" })
      .eq("id", shipment!.order_id)
      .in("status", ["shipped"]);
  }

  /**
   * A delivered shipment marks the order delivered, which starts the
   * buyer's seven day confirmation window. It deliberately does NOT
   * confirm the delivery: the carrier saying it arrived and the buyer
   * saying it is what they ordered are different claims, and only the
   * second releases money.
   */
  if (status === "delivered") {
    await svc
      .from("orders")
      .update({ status: "delivered", delivered_at: when })
      .eq("id", shipment!.order_id)
      .in("status", ["confirmed", "in_production", "shipped", "in_transit"]);
  }

  await tellThemAboutIt(shipment!.order_id, status, shipment!.reference);

  revalidatePath("/admin/shipments");
  revalidatePath(`/account/orders/${shipment!.order_id}`);
  back("recorded", shipmentId);
}

/** The two events a buyer actually wants to hear about. */
async function tellThemAboutIt(orderId: string, status: string, reference: string) {
  if (status !== "out_for_delivery" && status !== "delivered" && status !== "exception") return;

  const svc = serviceClient();
  const { data } = await svc
    .from("orders")
    .select("id, reference, buyer_company_id, buyer_profile_id, supplier_company_id")
    .eq("id", orderId)
    .maybeSingle();

  const order = data as unknown as {
    id: string;
    reference: string;
    buyer_company_id: string | null;
    buyer_profile_id: string | null;
    supplier_company_id: string;
  } | null;
  if (!order) return;

  if (status === "exception") {
    const notice = {
      kind: "order_shipped" as const,
      title: `There is a problem with ${order.reference}`,
      body:
        `Shipment ${reference} on order ${order.reference} has hit a problem in transit.\n\n` +
        "AfriLynq is dealing with the carrier. We will tell you as soon as it moves again.",
      linkPath: `/account/orders/${order.id}`,
      linkLabel: "Open the order",
    };
    await Promise.all([notifyBuyer(order, notice), notifyCompany(order.supplier_company_id, notice)]);
    return;
  }

  await notifyBuyer(order, {
    kind: status === "delivered" ? "order_delivered" : "order_shipped",
    title:
      status === "delivered"
        ? `Order ${order.reference} has arrived`
        : `Order ${order.reference} is out for delivery`,
    body:
      status === "delivered"
        ? `The carrier has delivered order ${order.reference}.\n\n` +
          "When you have checked it and it is what you ordered, confirm it on AfriLynq. " +
          "That is what releases the supplier's payment, and it releases automatically " +
          "after seven days if we do not hear from you."
        : `Shipment ${reference} is out for delivery today.`,
    linkPath: `/account/orders/${order.id}`,
    linkLabel: status === "delivered" ? "Confirm it arrived" : "Track it",
  });
}

/* ------------------------------------------------------------------
   Carriers
   ------------------------------------------------------------------ */

/**
 * Adding a carrier.
 *
 * A carrier that pushes status to us needs a secret, generated here
 * rather than typed. A human-chosen shared secret is a weak shared
 * secret, and this one is compared in constant time at the endpoint.
 */
export async function addCarrier(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/admin/carriers?done=noname");

  const slug =
    String(formData.get("slug") ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") ||
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const integration = String(formData.get("integration") ?? "manual");

  const countries = (name: string) =>
    String(formData.get(name) ?? "")
      .split(/[,\s]+/)
      .map((c) => c.trim().toUpperCase())
      .filter((c) => /^[A-Z]{2}$/.test(c));

  const svc = serviceClient();
  const { error } = await svc.from("carriers").insert({
    name,
    slug,
    integration,
    push_secret: integration === "push" ? randomBytes(32).toString("hex") : null,
    origin_countries: countries("origin_countries"),
    destination_countries: countries("destination_countries"),
    contact_name: String(formData.get("contact_name") ?? "").trim() || null,
    contact_email: String(formData.get("contact_email") ?? "").trim() || null,
    contact_phone: String(formData.get("contact_phone") ?? "").trim() || null,
    website: String(formData.get("website") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });

  if (error) {
    console.error("[carriers] insert failed", error);
    redirect(`/admin/carriers?done=${error.code === "23505" ? "duplicate" : "error"}`);
  }

  await svc.from("audit_log").insert({
    actor_id: admin.id,
    actor_email: admin.email,
    action: "carrier.added",
    entity_type: "carrier",
    entity_id: slug,
    after_state: { name, integration },
  });

  revalidatePath("/admin/carriers");
  redirect("/admin/carriers?done=added");
}

export async function setCarrierActive(
  carrierId: string,
  active: boolean
): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  await serviceClient().from("carriers").update({ active }).eq("id", carrierId);
  revalidatePath("/admin/carriers");
  redirect("/admin/carriers?done=updated");
}
