import Link from "next/link";
import { redirect } from "next/navigation";
import { currentCarrier, carrierJobs, type CarrierJob } from "@/lib/carrier";
import CarrierShell, { Card, money } from "@/components/carrier/Shell";
import { SHIPMENT_STATUS } from "@/lib/shipments";

export const dynamic = "force-dynamic";

/**
 * A carrier's job list.
 *
 * Split by what the carrier has to do next rather than by status, because
 * "what is waiting on me" is the only question somebody opens this page to
 * answer. Everything here comes from carrier_jobs, which filters to the
 * signed in carrier in the database rather than in this file.
 */

function label(status: string): string {
  return SHIPMENT_STATUS[status as keyof typeof SHIPMENT_STATUS]?.label ?? status;
}

function route(job: CarrierJob): string {
  const from = job.origin_country_code ?? "";
  const to = job.destination_country_code ?? "";
  return from && to ? `${from} to ${to}` : from || to || "Not stated";
}

function Pill({ tone, children }: { tone: "gold" | "blue" | "ok" | "hold"; children: React.ReactNode }) {
  const tones = {
    gold: "bg-gold/15 text-[#a97014]",
    blue: "bg-blue-500/12 text-blue-700",
    ok: "bg-[#2FA36B]/15 text-[#1d7a4c]",
    hold: "bg-[#C2453F]/12 text-[#a3332e]",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11.5px] font-extrabold ${tones[tone]}`}>
      {children}
    </span>
  );
}

function toneFor(job: CarrierJob): "gold" | "blue" | "ok" | "hold" {
  if (job.status === "delivered") return "ok";
  if (job.status === "exception") return "hold";
  if (job.status === "customs") return "gold";
  return "blue";
}

export default async function CarrierJobsPage() {
  const account = await currentCarrier();
  if (!account) redirect("/carrier/login");

  const jobs = await carrierJobs();
  const toPrice = jobs.filter((j) => j.awaiting_price);
  const moving = jobs.filter((j) => !j.awaiting_price);

  return (
    <CarrierShell
      account={account}
      title="Your jobs"
      intro={`Only consignments assigned to ${account.carrierName}. Nothing else on the platform is visible from this account.`}
    >
      {jobs.length === 0 ? (
        <Card title="Nothing assigned yet">
          <p className="px-6 py-8 text-sm leading-relaxed text-stone">
            When AfriLynq books a consignment with you it will appear here, with
            the weight, the addresses and everything else you need to move it.
            You will be asked for a price before anything is collected.
          </p>
        </Card>
      ) : null}

      {toPrice.length > 0 ? (
        <Card
          title="Waiting for your price"
          count={`${toPrice.length} to quote`}
          note="These cannot move until a price is agreed"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-[10px] font-extrabold uppercase tracking-[0.13em] text-stone">
                  <th className="border-b border-sand-deep px-6 py-3">Shipment</th>
                  <th className="border-b border-sand-deep px-6 py-3">Route</th>
                  <th className="border-b border-sand-deep px-6 py-3">Pieces</th>
                  <th className="border-b border-sand-deep px-6 py-3">Weight</th>
                  <th className="border-b border-sand-deep px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {toPrice.map((job) => (
                  <tr key={job.shipment_id}>
                    <td className="border-b border-sand-deep px-6 py-4 font-mono text-[13.5px] font-extrabold">
                      {job.reference}
                    </td>
                    <td className="border-b border-sand-deep px-6 py-4 text-sm text-stone">
                      {route(job)}
                    </td>
                    <td className="border-b border-sand-deep px-6 py-4 text-sm">
                      {job.pieces ?? "Not stated"}
                    </td>
                    <td className="border-b border-sand-deep px-6 py-4 text-sm">
                      {job.gross_weight_kg ? `${job.gross_weight_kg} kg` : "Not stated"}
                    </td>
                    <td className="border-b border-sand-deep px-6 py-4">
                      <Link
                        href={`/carrier/${job.shipment_id}`}
                        className="inline-block rounded-lg bg-gold px-3.5 py-2 text-[12.5px] font-extrabold text-[#04281a]"
                      >
                        Send a price
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {moving.length > 0 ? (
        <Card title="On the move" count={`${moving.length} live`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-[10px] font-extrabold uppercase tracking-[0.13em] text-stone">
                  <th className="border-b border-sand-deep px-6 py-3">Shipment</th>
                  <th className="border-b border-sand-deep px-6 py-3">Route</th>
                  <th className="border-b border-sand-deep px-6 py-3">Agreed price</th>
                  <th className="border-b border-sand-deep px-6 py-3">Status</th>
                  <th className="border-b border-sand-deep px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {moving.map((job) => (
                  <tr key={job.shipment_id}>
                    <td className="border-b border-sand-deep px-6 py-4 font-mono text-[13.5px] font-extrabold">
                      {job.reference}
                    </td>
                    <td className="border-b border-sand-deep px-6 py-4 text-sm text-stone">
                      {route(job)}
                    </td>
                    <td className="border-b border-sand-deep px-6 py-4 text-[15px] font-extrabold">
                      {money(job.freight_agreed_minor, job.freight_agreed_currency)}
                    </td>
                    <td className="border-b border-sand-deep px-6 py-4">
                      <Pill tone={toneFor(job)}>{label(job.status)}</Pill>
                    </td>
                    <td className="border-b border-sand-deep px-6 py-4">
                      <Link
                        href={`/carrier/${job.shipment_id}`}
                        className="text-[12.5px] font-extrabold text-[#a97014] hover:underline"
                      >
                        Post an update
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </CarrierShell>
  );
}
