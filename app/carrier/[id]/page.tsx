import { redirect } from "next/navigation";
import {
  currentCarrier,
  carrierJob,
  proposalsFor,
  carrierEvents,
  openProposal,
  acceptedProposal,
  waitingOn,
  CARRIER_REPORTABLE,
} from "@/lib/carrier";
import CarrierShell, {
  Card,
  Note,
  Field,
  inputClass,
  buttonClass,
  ghostButtonClass,
  money,
  when,
} from "@/components/carrier/Shell";
import { sendPrice, acceptOurPrice, postUpdate } from "../actions";

export const dynamic = "force-dynamic";

const NOTICE: Record<string, { text: string; good: boolean }> = {
  pricesent: { text: "Price sent. AfriLynq will come back to you.", good: true },
  priceaccepted: {
    text: "Accepted. AfriLynq will confirm it and the job can move.",
    good: true,
  },
  badprice: { text: "That price could not be read. Use digits, for example 1880.50.", good: false },
  pricefailed: {
    text: "That price could not be saved. It may already be agreed, or the job may no longer be yours.",
    good: false,
  },
  updateposted: { text: "Posted. The buyer can see it now.", good: true },
  updateheld: {
    text: "Posted. AfriLynq checks this one before the buyer sees it.",
    good: true,
  },
  badstatus: { text: "Choose what has happened before posting.", good: false },
  updatefailed: { text: "That update could not be saved.", good: false },
};

export default async function CarrierJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const account = await currentCarrier();
  if (!account) redirect("/carrier/login");

  const { id } = await params;
  const { done } = await searchParams;

  const job = await carrierJob(id);
  // Not an error page. A job that is not theirs simply does not exist as far
  // as this account is concerned, and that is the database's answer, not ours.
  if (!job) redirect("/carrier");

  const [proposals, events] = await Promise.all([
    proposalsFor(id),
    carrierEvents(id),
  ]);

  const open = openProposal(proposals);
  const agreed = acceptedProposal(proposals);
  const turn = waitingOn(proposals);
  const notice = done ? NOTICE[done] : null;

  const sendPriceHere = sendPrice.bind(null, id);
  const postUpdateHere = postUpdate.bind(null, id);

  return (
    <CarrierShell
      account={account}
      title={job.reference}
      intro={
        agreed
          ? `Price agreed at ${money(job.freight_agreed_minor, job.freight_agreed_currency)}. Report movement as the goods travel.`
          : "Agree a price with AfriLynq, then report movement as the goods travel."
      }
      back={{ href: "/carrier", label: "Back to your jobs" }}
    >
      {notice ? (
        <p
          className={`mt-5 rounded-lg border-l-4 px-4 py-3 text-sm ${
            notice.good
              ? "border-[#2FA36B] bg-[#2FA36B]/10 text-ink"
              : "border-[#C2453F] bg-[#C2453F]/10 text-ink"
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_480px]">
        <div>
          {/* ---------------- the job ---------------- */}
          <Card title="The job" note="Everything you need to move it">
            <dl className="grid grid-cols-2 gap-5 px-6 py-6">
              <Detail k="Pieces" v={job.pieces?.toString() ?? "Not stated"} />
              <Detail
                k="Gross weight"
                v={job.gross_weight_kg ? `${job.gross_weight_kg} kg` : "Not stated"}
              />
              <Detail
                k="Volume"
                v={job.volume_m3 ? `${job.volume_m3} m3` : "Not stated"}
              />
              <Detail
                k="Declared value"
                v={money(job.declared_value_minor, job.declared_currency)}
              />
              <Detail k="Incoterm" v={job.incoterm ?? "Not stated"} />
              <Detail k="Service" v={job.service ?? "Not stated"} />
              <Detail
                k="Collect from"
                v={job.origin_address ?? "Not stated"}
                wide
              />
              <Detail
                k="Deliver to"
                v={job.destination_address ?? "Not stated"}
                wide
              />
            </dl>
          </Card>

          {/* ---------------- post an update ---------------- */}
          {agreed ? (
            <Card title="Post an update">
              <form action={postUpdateHere} className="space-y-4 px-6 pt-5 pb-6">
                <Field label="What has happened">
                  <select name="status" required className={inputClass} defaultValue="">
                    <option value="" disabled>
                      Choose one
                    </option>
                    {CARRIER_REPORTABLE.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                        {s.held ? " (checked by AfriLynq first)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="What the buyer will read"
                  hint="Plain words. Say what happened and what comes next."
                >
                  <input
                    name="description"
                    className={inputClass}
                    placeholder="Left Lagos on flight KQ533. Next update when it lands."
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Where">
                    <input name="location" className={inputClass} placeholder="Lagos" />
                  </Field>
                  <Field label="When it happened" hint="Leave blank for now.">
                    <input type="datetime-local" name="occurred_at" className={inputClass} />
                  </Field>
                </div>

                <button type="submit" className={buttonClass}>
                  Post it
                </button>
              </form>

              <Note title="Most updates reach the buyer straight away">
                Picked up, on its way, clearing customs and out for delivery appear
                on the buyer&apos;s tracking page the moment you post them.
                Delivered, and anything reported as a problem, is checked by
                AfriLynq first, because those two change what the buyer is owed.
              </Note>
            </Card>
          ) : (
            <Card title="Post an update">
              <p className="px-6 py-8 text-sm leading-relaxed text-stone">
                Updates open once the price is agreed. Nothing should be collected
                before then.
              </p>
            </Card>
          )}

          {/* ---------------- what you have reported ---------------- */}
          {events.length > 0 ? (
            <Card title="What you have reported">
              <ul className="px-6 py-2">
                {events.map((e) => (
                  <li key={e.id} className="border-b border-sand-deep py-4 last:border-b-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[14.5px] font-bold">
                        {CARRIER_REPORTABLE.find((s) => s.value === e.status)?.label ??
                          e.status}
                      </span>
                      {e.approval_state === "pending" ? (
                        <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-extrabold text-[#a97014]">
                          With AfriLynq
                        </span>
                      ) : e.approval_state === "rejected" ? (
                        <span className="rounded-full bg-[#C2453F]/12 px-2.5 py-0.5 text-[11px] font-extrabold text-[#a3332e]">
                          Not published
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#2FA36B]/15 px-2.5 py-0.5 text-[11px] font-extrabold text-[#1d7a4c]">
                          Buyer can see it
                        </span>
                      )}
                    </div>
                    {e.description ? (
                      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
                        {e.description}
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-[11.5px] text-stone">
                      {when(e.occurred_at)}
                      {e.location ? ` at ${e.location}` : ""}
                    </p>
                    {e.review_note && e.approval_state === "rejected" ? (
                      <p className="mt-2 rounded border-l-4 border-[#C2453F] bg-sand px-3 py-2 text-[12.5px] text-ink-soft">
                        AfriLynq: {e.review_note}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        {/* ---------------- the price ---------------- */}
        <div>
          <Card
            title="The price"
            count={
              agreed
                ? "Agreed"
                : turn === "carrier"
                  ? "Waiting on you"
                  : "With AfriLynq"
            }
          >
            {proposals.length > 0 ? (
              <ul className="px-6 pt-2">
                {proposals.map((p) => {
                  const live = p.status === "open";
                  const isAgreed = p.status === "accepted";
                  return (
                    <li
                      key={p.id}
                      className={`flex gap-4 border-b border-sand-deep py-4 last:border-b-0 ${
                        live || isAgreed ? "" : "opacity-55"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold text-white ${
                          p.proposed_by === "carrier" ? "bg-forest-soft" : "bg-gold-deep"
                        }`}
                      >
                        {p.proposed_by === "carrier" ? "YOU" : "AL"}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-extrabold">
                          {p.proposed_by === "carrier" ? account.carrierName : "AfriLynq"}
                        </div>
                        <div
                          className={`mt-0.5 text-xl font-extrabold tracking-tight ${
                            live || isAgreed ? "" : "line-through"
                          }`}
                        >
                          {money(p.amount_minor, p.currency)}
                        </div>
                        {p.chargeable_weight_kg ? (
                          <div className="mt-0.5 text-[12px] text-stone">
                            {p.chargeable_weight_kg} kg chargeable
                          </div>
                        ) : null}
                        {p.note ? (
                          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
                            {p.note}
                          </p>
                        ) : null}
                        <p className="mt-1.5 text-[11.5px] text-stone">
                          {when(p.created_at)}
                          {isAgreed ? " · agreed" : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {agreed ? (
              <div className="px-6 py-6">
                <p className="text-sm leading-relaxed text-ink-soft">
                  Settled at{" "}
                  <b>{money(job.freight_agreed_minor, job.freight_agreed_currency)}</b>.
                  Invoice AfriLynq for this figure when the job is complete.
                </p>
              </div>
            ) : (
              <form action={sendPriceHere} className="space-y-4 border-t border-sand-deep px-6 pt-5 pb-6">
                {open ? <input type="hidden" name="parent_id" value={open.id} /> : null}

                <div className="grid grid-cols-[88px_1fr] gap-3">
                  <Field label="Currency">
                    <select
                      name="currency"
                      className={inputClass}
                      defaultValue={open?.currency ?? job.declared_currency ?? "GBP"}
                    >
                      <option>GBP</option>
                      <option>USD</option>
                      <option>EUR</option>
                      <option>NGN</option>
                    </select>
                  </Field>
                  <Field label={open ? "Your answer" : "Your price"}>
                    <input
                      name="amount"
                      required
                      inputMode="decimal"
                      className={inputClass}
                      placeholder="1880.00"
                    />
                  </Field>
                </div>

                <Field
                  label="Chargeable weight"
                  hint="Optional, in kg. Where our figure differs from yours this is usually why."
                >
                  <input name="weight" inputMode="decimal" className={inputClass} placeholder="420" />
                </Field>

                <Field label="Note">
                  <input
                    name="note"
                    className={inputClass}
                    placeholder="Includes the fuel surcharge."
                  />
                </Field>

                <button type="submit" className={buttonClass}>
                  {open ? "Send this price" : "Send your price"}
                </button>
              </form>
            )}

            {/* Its own form, outside the one above. A form inside a form is
                invalid HTML and browsers drop the inner one, so the button
                would silently do nothing. */}
            {!agreed && open && open.proposed_by === "admin" ? (
              <div className="-mt-2 px-6 pb-6">
                <AcceptButton
                  id={id}
                  proposalId={open.id}
                  amount={money(open.amount_minor, open.currency)}
                />
              </div>
            ) : null}

            <Note title="Every offer is kept">
              The whole exchange stays on the shipment, so a disagreement about
              what was agreed is settled by reading it rather than searching
              through messages.
            </Note>
          </Card>
        </div>
      </div>
    </CarrierShell>
  );
}

function Detail({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <dt className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-stone">
        {k}
      </dt>
      <dd className="mt-1 text-[15px] font-bold leading-snug">{v}</dd>
    </div>
  );
}

/** A second form, because two submits in one form cannot carry different actions. */
function AcceptButton({
  id,
  proposalId,
  amount,
}: {
  id: string;
  proposalId: string;
  amount: string;
}) {
  const accept = acceptOurPrice.bind(null, id, proposalId);
  return (
    <form action={accept}>
      <button type="submit" className={ghostButtonClass}>
        Accept {amount}
      </button>
    </form>
  );
}
