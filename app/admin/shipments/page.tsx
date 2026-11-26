import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase-server";
import { serviceClient } from "@/lib/supabase";
import AdminShell, { Panel } from "@/components/admin/Shell";
import { TableWrap, Th, Td, Empty } from "@/components/admin/Money";
import { shortDate } from "@/lib/admin-money";
import {
  SHIPMENT_STATUS,
  SHIPMENT_PATH,
  nextStatuses,
  formatWeight,
  blockingDocumentsMissing,
  DOCUMENT_KIND,
  carrierCovers,
  type ShipmentStatus,
} from "@/lib/shipments";
import { bookShipment, recordEvent } from "./actions";

export const dynamic = "force-dynamic";

/**
 * The shipments board.
 *
 * Two halves. What is moving, and what is waiting to move. The second is
 * the one that earns its place: an order that has been paid for and has
 * no carrier booked is money sitting still, and nothing else on the
 * platform surfaces it.
 */

const NOTICE: Record<string, { text: string; tone: string }> = {
  booked: {
    text: "Booked. The supplier has been told to have the goods and paperwork ready.",
    tone: "border-[#2FA36B]/30 bg-[#2FA36B]/10 text-[#4CC98D]",
  },
  recorded: {
    text: "Recorded. Both sides see it where it matters.",
    tone: "border-[#2FA36B]/30 bg-[#2FA36B]/10 text-[#4CC98D]",
  },
  notpaid: {
    text: "That order has not been paid for. Nothing ships before the money is in.",
    tone: "border-gold/30 bg-gold/10 text-gold",
  },
  alreadybooked: {
    text: "That order already has a shipment open. Cancel it first, or record against the existing one.",
    tone: "border-gold/30 bg-gold/10 text-gold",
  },
  nocarrier: {
    text: "Choose a carrier.",
    tone: "border-[#C2453F]/30 bg-[#C2453F]/10 text-[#E58B85]",
  },
  badstep: {
    text: "A shipment cannot go from where it is to where you asked.",
    tone: "border-[#C2453F]/30 bg-[#C2453F]/10 text-[#E58B85]",
  },
  notfound: {
    text: "That no longer exists.",
    tone: "border-[#C2453F]/30 bg-[#C2453F]/10 text-[#E58B85]",
  },
  error: {
    text: "Could not do that, and nothing was changed. The reason is in the server log.",
    tone: "border-[#C2453F]/30 bg-[#C2453F]/10 text-[#E58B85]",
  },
};

type Shipment = {
  id: string;
  reference: string;
  order_id: string;
  carrier_id: string | null;
  tracking_reference: string | null;
  service: string | null;
  status: string;
  pieces: number | null;
  gross_weight_kg: number | null;
  origin_country_code: string | null;
  destination_country_code: string | null;
  expected_delivery: string | null;
  collected_at: string | null;
  delivered_at: string | null;
  booked_at: string;
};

export default async function AdminShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const { done } = await searchParams;
  const svc = serviceClient();

  const [shipmentsRes, carriersRes, needingRes] = await Promise.all([
    svc.from("shipments").select("*").order("booked_at", { ascending: false }).limit(200),
    svc.from("carriers").select("*").eq("active", true).order("name"),
    // Paid orders with nothing moving against them. The whole reason this
    // page has a second half.
    svc
      .from("orders")
      .select(
        "id, reference, status, currency, total_minor, delivery_country_code, " +
          "delivery_address, supplier_company_id, created_at"
      )
      .in("status", ["confirmed", "in_production"])
      .order("created_at", { ascending: true })
      .limit(50),
  ]);

  const shipments = (shipmentsRes.data ?? []) as unknown as Shipment[];
  const carriers = (carriersRes.data ?? []) as unknown as {
    id: string;
    name: string;
    slug: string;
    integration: string;
    origin_countries: string[] | null;
    destination_countries: string[] | null;
  }[];
  const candidateOrders = (needingRes.data ?? []) as unknown as {
    id: string;
    reference: string;
    status: string;
    currency: string;
    total_minor: number;
    delivery_country_code: string | null;
    delivery_address: string | null;
    supplier_company_id: string;
    created_at: string;
  }[];

  const carrierById = new Map(carriers.map((c) => [c.id, c] as const));

  // Orders already covered by an open shipment are not waiting for one.
  const covered = new Set(
    shipments.filter((s) => s.status !== "delivered" && s.status !== "cancelled").map((s) => s.order_id)
  );
  const waiting = candidateOrders.filter((o) => !covered.has(o.id));

  const orderIds = [...new Set([...shipments.map((s) => s.order_id), ...waiting.map((o) => o.id)])];
  const supplierIds = [...new Set(waiting.map((o) => o.supplier_company_id))];

  const [ordersRes, eventsRes, docsRes, companiesRes] = await Promise.all([
    orderIds.length
      ? svc.from("orders").select("id, reference, status").in("id", orderIds)
      : Promise.resolve({ data: [] }),
    shipments.length
      ? svc
          .from("shipment_events")
          .select("shipment_id, status, description, location, occurred_at")
          .in("shipment_id", shipments.map((s) => s.id))
          .order("occurred_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    shipments.length
      ? svc
          .from("shipment_documents")
          .select("shipment_id, kind")
          .in("shipment_id", shipments.map((s) => s.id))
      : Promise.resolve({ data: [] }),
    supplierIds.length
      ? svc.from("companies").select("id, legal_name, trading_name").in("id", supplierIds)
      : Promise.resolve({ data: [] }),
  ]);

  const orders = new Map(
    ((ordersRes.data ?? []) as unknown as { id: string; reference: string; status: string }[])
      .map((o) => [o.id, o] as const)
  );
  const companies = new Map(
    ((companiesRes.data ?? []) as { id: string; legal_name: string; trading_name: string | null }[])
      .map((c) => [c.id, c.trading_name || c.legal_name] as const)
  );

  const eventsBy = new Map<string, { status: string; description: string | null; location: string | null; occurred_at: string }[]>();
  for (const e of (eventsRes.data ?? []) as {
    shipment_id: string;
    status: string;
    description: string | null;
    location: string | null;
    occurred_at: string;
  }[]) {
    const list = eventsBy.get(e.shipment_id) ?? [];
    list.push(e);
    eventsBy.set(e.shipment_id, list);
  }

  const docsBy = new Map<string, string[]>();
  for (const d of (docsRes.data ?? []) as { shipment_id: string; kind: string }[]) {
    const list = docsBy.get(d.shipment_id) ?? [];
    list.push(d.kind);
    docsBy.set(d.shipment_id, list);
  }

  const moving = shipments.filter((s) => s.status !== "delivered" && s.status !== "cancelled");
  const finished = shipments.filter((s) => s.status === "delivered" || s.status === "cancelled");
  const problems = shipments.filter((s) => s.status === "exception");

  const notice = done ? NOTICE[done] : null;

  return (
    <AdminShell admin={admin} title="Shipments" subtitle="What is moving, and what is waiting to">
      {notice && (
        <p className={`mb-6 rounded-xl border px-4 py-3 text-sm ${notice.tone}`}>{notice.text}</p>
      )}

      {carriers.length === 0 && (
        <p className="mb-6 rounded-lg border-l-2 border-gold bg-white/[0.04] px-4 py-3 text-sm text-white/75">
          No carriers yet, so nothing can be booked.{" "}
          <Link href="/admin/carriers" className="text-gold hover:underline">
            Add one first
          </Link>
          .
        </p>
      )}

      {problems.length > 0 && (
        <p className="mb-6 rounded-lg border-l-2 border-[#C2453F] bg-[#C2453F]/[0.08] px-4 py-3 text-sm text-white/80">
          {problems.length === 1
            ? "One shipment has hit a problem"
            : `${problems.length} shipments have hit a problem`}{" "}
          and both sides have been told. They are listed below.
        </p>
      )}

      {/* Waiting to move */}
      <Panel title={`Paid and waiting for a carrier${waiting.length ? ` (${waiting.length})` : ""}`}>
        {waiting.length === 0 ? (
          <Empty>
            Nothing waiting. Every paid order has a shipment against it, which is where you
            want to be.
          </Empty>
        ) : (
          <ul className="space-y-4">
            {waiting.map((o) => (
              <li key={o.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="tabular text-sm font-semibold text-white">{o.reference}</p>
                    <p className="mt-0.5 text-xs text-white/45">
                      {companies.get(o.supplier_company_id) ?? "Unknown supplier"}
                      {o.delivery_country_code ? ` to ${o.delivery_country_code}` : ""} · paid{" "}
                      {shortDate(o.created_at)}
                    </p>
                  </div>
                </div>

                <form
                  action={bookShipment.bind(null, o.id)}
                  className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
                >
                  <Field label="Carrier">
                    <select name="carrier_id" required className={inputClass}>
                      <option value="">Choose</option>
                      {carriers.map((c) => {
                        const fits = carrierCovers(c, null, o.delivery_country_code);
                        return (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {fits ? "" : " (outside their usual lanes)"}
                          </option>
                        );
                      })}
                    </select>
                  </Field>
                  <Field label="Tracking reference">
                    <input name="tracking_reference" className={inputClass} placeholder="Optional" />
                  </Field>
                  <Field label="Pieces">
                    <input name="pieces" inputMode="numeric" className={inputClass} />
                  </Field>
                  <Field label="Gross weight, kg">
                    <input name="gross_weight_kg" inputMode="decimal" className={inputClass} />
                  </Field>
                  <Field label="Collecting from">
                    <input
                      name="origin_country_code"
                      maxLength={2}
                      placeholder="NG"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Expected delivery">
                    <input name="expected_delivery" type="date" className={inputClass} />
                  </Field>
                  <Field label="Notes">
                    <input name="notes" className={inputClass} />
                  </Field>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-[#042115]"
                    >
                      Book it
                    </button>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Moving */}
      <div className="mt-6">
        <Panel title={`In motion${moving.length ? ` (${moving.length})` : ""}`}>
          {moving.length === 0 ? (
            <Empty>Nothing in motion.</Empty>
          ) : (
            <ul className="space-y-4">
              {moving.map((s) => {
                const carrier = s.carrier_id ? carrierById.get(s.carrier_id) : undefined;
                const order = orders.get(s.order_id);
                const state = SHIPMENT_STATUS[s.status as ShipmentStatus];
                const events = eventsBy.get(s.id) ?? [];
                const missing = blockingDocumentsMissing(docsBy.get(s.id) ?? []);
                const steps = nextStatuses(s.status);

                return (
                  <li key={s.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="tabular text-sm font-semibold text-white">
                          {s.reference}
                          {order && (
                            <span className="ml-2 font-normal text-white/50">{order.reference}</span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-white/45">
                          {carrier?.name ?? "No carrier"}
                          {s.tracking_reference ? ` · ${s.tracking_reference}` : ""}
                          {s.origin_country_code && s.destination_country_code
                            ? ` · ${s.origin_country_code} to ${s.destination_country_code}`
                            : ""}
                          {s.gross_weight_kg ? ` · ${formatWeight(s.gross_weight_kg)}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ring-1 ${state?.tone ?? ""}`}
                      >
                        {state?.label ?? s.status}
                      </span>
                    </div>

                    <Progress status={s.status} />

                    {missing.length > 0 && (
                      <p className="mt-3 rounded-lg border border-[#C2453F]/25 bg-[#C2453F]/[0.08] px-4 py-2.5 text-xs text-[#E58B85]">
                        Missing paperwork that stops a load at the border:{" "}
                        {missing.map((k) => DOCUMENT_KIND[k].label).join(", ")}.
                      </p>
                    )}

                    {events.length > 0 && (
                      <ul className="mt-3 space-y-1.5 border-l border-white/10 pl-4">
                        {events.slice(0, 4).map((e, i) => (
                          <li key={i} className="text-xs text-white/50">
                            <span className="text-white/70">
                              {SHIPMENT_STATUS[e.status as ShipmentStatus]?.label ?? e.status}
                            </span>
                            {e.location ? ` · ${e.location}` : ""}
                            {e.description ? ` · ${e.description}` : ""}
                            <span className="ml-1 text-white/30">{shortDate(e.occurred_at)}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {steps.length > 0 && (
                      <form
                        action={recordEvent.bind(null, s.id)}
                        className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
                      >
                        <Field label="What happened">
                          <select name="status" required className={inputClass}>
                            {steps.map((st) => (
                              <option key={st} value={st}>
                                {SHIPMENT_STATUS[st].label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Where">
                          <input name="location" className={inputClass} placeholder="Lagos" />
                        </Field>
                        <Field label="Note">
                          <input name="description" className={inputClass} />
                        </Field>
                        <Field label="When">
                          <input name="occurred_at" type="datetime-local" className={inputClass} />
                        </Field>
                        <div className="flex items-end">
                          <button
                            type="submit"
                            className="w-full rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/8"
                          >
                            Record
                          </button>
                        </div>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {/* Done */}
      {finished.length > 0 && (
        <div className="mt-6">
          <Panel title="Finished">
            <TableWrap>
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Order</Th>
                  <Th>Carrier</Th>
                  <Th>Route</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {finished.map((s) => {
                  const carrier = s.carrier_id ? carrierById.get(s.carrier_id) : undefined;
                  const order = orders.get(s.order_id);
                  const state = SHIPMENT_STATUS[s.status as ShipmentStatus];
                  return (
                    <tr key={s.id}>
                      <Td>
                        <span className="tabular font-semibold text-white">{s.reference}</span>
                        <span className="mt-0.5 block text-xs text-white/40">
                          {s.delivered_at ? shortDate(s.delivered_at) : shortDate(s.booked_at)}
                        </span>
                      </Td>
                      <Td muted>{order?.reference ?? ""}</Td>
                      <Td muted>{carrier?.name ?? ""}</Td>
                      <Td muted>
                        {s.origin_country_code && s.destination_country_code
                          ? `${s.origin_country_code} to ${s.destination_country_code}`
                          : ""}
                      </Td>
                      <Td>
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ring-1 ${state?.tone ?? ""}`}
                        >
                          {state?.label ?? s.status}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          </Panel>
        </div>
      )}
    </AdminShell>
  );
}

const inputClass =
  "w-full rounded-lg bg-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-white/25";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[0.68rem] font-semibold tracking-widest text-white/40 uppercase">
        {label}
      </span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

/** Where along the normal run this load has got to. */
function Progress({ status }: { status: string }) {
  const here = SHIPMENT_STATUS[status as ShipmentStatus]?.step ?? 0;
  if (here === 0) return null;

  return (
    <ol className="mt-3 flex gap-1" aria-label="Progress">
      {SHIPMENT_PATH.map((s) => {
        const step = SHIPMENT_STATUS[s].step;
        return (
          <li
            key={s}
            title={SHIPMENT_STATUS[s].label}
            className={`h-1 flex-1 rounded-full ${
              step <= here ? "bg-[#2FA36B]" : "bg-white/10"
            }`}
          />
        );
      })}
    </ol>
  );
}
