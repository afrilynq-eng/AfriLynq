import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { userCompanies, sessionClient } from "@/lib/supabase-server";
import { SERVICE_CHARGE_PERCENT, SERVICE_CHARGE_NAME } from "@/lib/fees";
import { formatMinor } from "@/lib/money";
import {
  METHOD_LABEL,
  describeDestination,
  whatIsMissing,
  type PayoutDestination,
  type PayoutMethod,
} from "@/lib/payout-destinations";
import { savePayoutDestination, removePayoutDestination } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Getting paid",
  robots: { index: false, follow: false },
};

const NOTICE: Record<string, { text: string; tone: string }> = {
  ok: {
    text: "Saved. This is where your money will be sent.",
    tone: "border-forest/30 bg-forest/10 text-forest",
  },
  removed: {
    text: "Removed. Add another before your next order completes, or there is nowhere to send your money.",
    tone: "border-gold/30 bg-gold/10 text-gold-deep",
  },
  noname: {
    text: "Enter the name on the account. A transfer to a name that does not match the account is the commonest reason one bounces.",
    tone: "border-[#d9b3aa] bg-[#f6e3e0] text-[#8c3b2c]",
  },
  nobank: { text: "Enter the name of your bank.", tone: "border-[#d9b3aa] bg-[#f6e3e0] text-[#8c3b2c]" },
  badnumber: {
    text: "That does not look like an account number. It should be digits only.",
    tone: "border-[#d9b3aa] bg-[#f6e3e0] text-[#8c3b2c]",
  },
  nonetwork: {
    text: "Enter which mobile money network the number is on.",
    tone: "border-[#d9b3aa] bg-[#f6e3e0] text-[#8c3b2c]",
  },
  badphone: {
    text: "Enter the phone number with its country code, for example +260977123456.",
    tone: "border-[#d9b3aa] bg-[#f6e3e0] text-[#8c3b2c]",
  },
  nocurrency: {
    text: "Choose which currency you want to be paid in.",
    tone: "border-[#d9b3aa] bg-[#f6e3e0] text-[#8c3b2c]",
  },
  duplicate: {
    text: "You already have an account saved for that currency. Edit it rather than adding a second.",
    tone: "border-gold/30 bg-gold/10 text-gold-deep",
  },
  nocompany: {
    text: "Only a selling company can set up payouts.",
    tone: "border-sand-deep bg-sand-deep/40 text-ink-soft",
  },
  error: {
    text: "We could not save that. Try again, and email info@afrilynq.co.uk if it keeps happening.",
    tone: "border-[#d9b3aa] bg-[#f6e3e0] text-[#8c3b2c]",
  },
};

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; method?: string; edit?: string }>;
}) {
  const { saved, method: methodParam, edit } = await searchParams;

  const companies = await userCompanies();
  const company = companies[0];
  if (!company) redirect("/account");
  if (company.company_type === "buyer") redirect("/account");

  const supabase = await sessionClient();

  /**
   * Read through the user's own session, not the service key.
   *
   * payout_accounts is limited by row level security to the rows belonging
   * to companies this person is in. Reading it as them means that policy
   * is what decides, which is the point of having written it.
   */
  const [destinationsRes, payoutsRes, currenciesRes] = await Promise.all([
    supabase
      .from("payout_accounts")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("payouts")
      .select("id, reference, status, currency, net_minor, paid_at, created_at, order_id")
      .eq("supplier_company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("currencies").select("code, minor_units").order("code"),
  ]);

  const destinations = (destinationsRes.data ?? []) as unknown as PayoutDestination[];
  const payouts = (payoutsRes.data ?? []) as unknown as {
    id: string;
    reference: string;
    status: string;
    currency: string;
    net_minor: number;
    paid_at: string | null;
    created_at: string;
    order_id: string;
  }[];
  const currencies = (currenciesRes.data ?? []) as { code: string; minor_units: number }[];
  const scale = (code: string) =>
    currencies.find((c) => c.code === code)?.minor_units ?? 2;

  const editing = edit ? destinations.find((d) => d.id === edit) : undefined;
  const method: PayoutMethod =
    (methodParam as PayoutMethod) ??
    (editing?.method as PayoutMethod) ??
    (destinations[0]?.method as PayoutMethod) ??
    "bank";

  const ready = destinations.length > 0;
  const notice = saved ? NOTICE[saved] : null;

  const state = ready
    ? { label: "Ready to be paid", tone: "bg-forest/10 text-forest" }
    : { label: "Nowhere to send your money", tone: "bg-gold/15 text-gold-deep" };

  const owed = payouts.filter((p) => p.status !== "paid" && p.status !== "failed");
  const paid = payouts.filter((p) => p.status === "paid");

  const date = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";

  // The form posts to a server action, so the method toggle is a link
  // rather than a script: the page simply re-renders with the other set
  // of fields. One fewer thing that can break with JavaScript switched off.
  const toggleHref = (m: PayoutMethod) =>
    `/account/payouts?method=${m}${editing ? `&edit=${editing.id}` : ""}`;

  return (
    <div className="space-y-6">
      {notice && (
        <p className={`rounded-xl border px-4 py-3 text-sm ${notice.tone}`}>{notice.text}</p>
      )}

      <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl">Getting paid</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
              A buyer pays AfriLynq when they accept your quotation, and we hold the money
              until they confirm the goods arrived. This is where you tell us which account
              to send it to.
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${state.tone}`}>
            {state.label}
          </span>
        </div>
      </div>

      {company.verification_status !== "verified" && (
        <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
          <h2 className="text-lg">Verification comes first</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Your company is not verified yet, so nothing of yours is on sale and there is
            nothing to pay out. You can still add your account now if you would rather have
            it done.
          </p>
          <Link
            href="/account/documents"
            className="mt-4 inline-block rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest/90"
          >
            Documents and verification
          </Link>
        </div>
      )}

      {/* What is saved now */}
      {destinations.length > 0 && (
        <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
          <h2 className="text-lg">Where your money goes</h2>
          <ul className="mt-4 space-y-3">
            {destinations.map((d) => {
              const gaps = whatIsMissing(d).filter(
                (g) => !g.includes("AfriLynq fills in")
              );
              return (
                <li
                  key={d.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-sand bg-sand/30 px-4 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {describeDestination(d)}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {METHOD_LABEL[d.method as PayoutMethod] ?? d.method} ·{" "}
                      {d.account_name} · paid in {d.currency}
                    </p>
                    {gaps.length > 0 && (
                      <p className="mt-1.5 text-xs text-[#8c3b2c]">
                        Still needed: {gaps.join(", ")}.
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/account/payouts?edit=${d.id}`}
                      className="rounded-lg border border-sand-deep px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-sand"
                    >
                      Change
                    </Link>
                    <form action={removePayoutDestination.bind(null, d.id)}>
                      <button
                        type="submit"
                        className="rounded-lg border border-sand-deep px-3.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-sand"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* The form */}
      <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
        <h2 className="text-lg">
          {editing ? "Change your account" : destinations.length > 0 ? "Add another" : "Add your account"}
        </h2>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["bank", "mobile_money"] as PayoutMethod[]).map((m) => (
            <Link
              key={m}
              href={toggleHref(m)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                method === m
                  ? "bg-forest text-white"
                  : "border border-sand-deep text-ink-soft hover:bg-sand"
              }`}
            >
              {METHOD_LABEL[m]}
            </Link>
          ))}
        </div>

        <form action={savePayoutDestination} className="mt-6 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="method" value={method} />
          {editing && <input type="hidden" name="id" value={editing.id} />}

          {method === "bank" ? (
            <>
              <Field label="Bank name" hint="As the bank writes it">
                <input
                  name="bank_name"
                  required
                  defaultValue={editing?.bank_name ?? ""}
                  placeholder="United Bank for Africa"
                  className="w-full rounded-lg border border-sand-deep px-3 py-2.5 text-sm"
                />
              </Field>
              <Field label="Account number" hint="Digits only">
                <input
                  name="account_number"
                  required
                  inputMode="numeric"
                  defaultValue={editing?.account_number ?? ""}
                  placeholder="2109876543"
                  className="tabular w-full rounded-lg border border-sand-deep px-3 py-2.5 text-sm"
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Network" hint="MTN, Airtel, Moov, and so on">
                <input
                  name="network"
                  required
                  defaultValue={editing?.network ?? ""}
                  placeholder="MTN"
                  className="w-full rounded-lg border border-sand-deep px-3 py-2.5 text-sm"
                />
              </Field>
              <Field label="Phone number" hint="With the country code">
                <input
                  name="phone"
                  required
                  inputMode="tel"
                  defaultValue={editing?.phone ?? ""}
                  placeholder="+260977123456"
                  className="tabular w-full rounded-lg border border-sand-deep px-3 py-2.5 text-sm"
                />
              </Field>
            </>
          )}

          <Field
            label="Name on the account"
            hint="Must match exactly, or the transfer bounces"
          >
            <input
              name="account_name"
              required
              defaultValue={editing?.account_name ?? company.legal_name ?? ""}
              className="w-full rounded-lg border border-sand-deep px-3 py-2.5 text-sm"
            />
          </Field>

          <Field label="Pay me in" hint="The currency this account holds">
            <select
              name="currency"
              defaultValue={editing?.currency ?? "NGN"}
              className="w-full rounded-lg border border-sand-deep px-3 py-2.5 text-sm"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-forest px-6 py-3 text-sm font-semibold text-white hover:bg-forest/90"
            >
              {editing ? "Save changes" : "Save account"}
            </button>
            {editing && (
              <Link
                href="/account/payouts"
                className="ml-3 text-sm text-ink-soft hover:underline"
              >
                Cancel
              </Link>
            )}
          </div>
        </form>

        <p className="mt-5 border-t border-sand pt-4 text-xs leading-relaxed text-ink-soft">
          Only you and AfriLynq can see these details. They are never shown to buyers, and
          never appear on a quotation, an order or an invoice.
        </p>
      </div>

      {/* What they are owed and what has been paid */}
      {payouts.length > 0 && (
        <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
          <h2 className="text-lg">Your payments</h2>
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-deep text-xs tracking-wide text-stone uppercase">
                <th scope="col" className="py-2.5 font-semibold">Reference</th>
                <th scope="col" className="py-2.5 font-semibold">Status</th>
                <th scope="col" className="py-2.5 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-sand last:border-0">
                  <td className="py-3.5">
                    <span className="tabular font-medium text-ink">{p.reference}</span>
                    <span className="mt-0.5 block text-xs text-ink-soft">
                      {date(p.paid_at ?? p.created_at)}
                    </span>
                  </td>
                  <td className="py-3.5 text-ink-soft">
                    {p.status === "paid"
                      ? "Paid"
                      : p.status === "pending"
                        ? "Waiting on delivery confirmation"
                        : p.status === "approved"
                          ? "Approved, on its way"
                          : p.status === "processing"
                            ? "Sent"
                            : p.status === "manual"
                              ? "Being arranged directly"
                              : "Failed"}
                  </td>
                  <td className="tabular py-3.5 text-right font-semibold text-ink">
                    {formatMinor(p.net_minor, p.currency, scale(p.currency))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-ink-soft">
            {owed.length > 0
              ? `${owed.length} ${owed.length === 1 ? "payment is" : "payments are"} still to reach you. `
              : ""}
            {paid.length > 0 ? `${paid.length} already ${paid.length === 1 ? "has" : "have"}.` : ""}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
        <h2 className="text-lg">What reaches you</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          AfriLynq deducts the {SERVICE_CHARGE_NAME} of {SERVICE_CHARGE_PERCENT} percent
          from the sale value. On a sale of £1,000 that is £
          {((1000 * SERVICE_CHARGE_PERCENT) / 100).toFixed(2)}, and £
          {(1000 - (1000 * SERVICE_CHARGE_PERCENT) / 100).toFixed(2)} reaches you. The
          payment provider takes their own fee from AfriLynq, not from you.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Money is released when the buyer confirms delivery, not when they pay. Nobody is
          charged anything until there are completed orders to charge on.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-ink-soft">{hint}</span>}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}
