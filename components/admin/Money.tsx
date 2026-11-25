import Link from "next/link";

/**
 * The pieces the three money screens share.
 *
 * The status words here are deliberately not the ones in lib/money.ts. A
 * supplier reading their own order wants "Payout approved". An
 * administrator looking at a queue wants to know what is waiting on them,
 * so the same row reads "Cleared, not yet sent". Same database value,
 * different reader, different sentence.
 */

type Tone = "gold" | "green" | "blue" | "red" | "slate";

const TONE: Record<Tone, string> = {
  gold: "bg-gold/15 text-gold ring-gold/25",
  green: "bg-[#2FA36B]/15 text-[#4CC98D] ring-[#2FA36B]/25",
  blue: "bg-[#3B82F6]/15 text-[#7DA9F8] ring-[#3B82F6]/25",
  red: "bg-[#C2453F]/15 text-[#E58B85] ring-[#C2453F]/25",
  slate: "bg-white/8 text-white/55 ring-white/10",
};

const RULE: Record<Tone, string> = {
  gold: "#D08D1D",
  green: "#2FA36B",
  blue: "#3B82F6",
  red: "#C2453F",
  slate: "#6B7A72",
};

export const PAYMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Checkout open", tone: "gold" },
  successful: { label: "Received", tone: "green" },
  failed: { label: "Failed", tone: "red" },
  cancelled: { label: "Abandoned", tone: "slate" },
  refunded: { label: "Refunded", tone: "blue" },
  partially_refunded: { label: "Part refunded", tone: "blue" },
};

export const PAYOUT_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Owed, delivery unconfirmed", tone: "slate" },
  approved: { label: "Cleared, not yet sent", tone: "gold" },
  processing: { label: "Sent, awaiting provider", tone: "blue" },
  paid: { label: "Paid", tone: "green" },
  failed: { label: "Failed", tone: "red" },
  manual: { label: "Settle by hand", tone: "gold" },
};

export const REFUND_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "In progress", tone: "gold" },
  completed: { label: "Refunded", tone: "green" },
  failed: { label: "Failed", tone: "red" },
};

export function StatusPill({
  status,
  map,
}: {
  status: string;
  map: Record<string, { label: string; tone: Tone }>;
}) {
  const s = map[status] ?? { label: status, tone: "slate" as Tone };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-[0.7rem] font-semibold whitespace-nowrap ring-1 ${TONE[s.tone]}`}
    >
      {s.label}
    </span>
  );
}

/**
 * A stat card that shows money.
 *
 * One line per currency, because the platform takes payment in several and
 * a single figure across them would be a number that is wrong everywhere.
 * StatCard in the shell is still right for counts; this is for amounts.
 */
export function MoneyCard({
  label,
  amounts,
  caption,
  accent = "gold",
}: {
  label: string;
  amounts: string[];
  caption?: string;
  accent?: Tone;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-white/[0.04] ring-1 ring-white/8">
      <div className="h-[3px]" style={{ background: RULE[accent] }} />
      <div className="px-5 py-5">
        <p className="text-[0.7rem] font-semibold tracking-widest text-white/45 uppercase">
          {label}
        </p>
        {amounts.length === 0 ? (
          <p className="tabular mt-2 text-3xl font-semibold text-white/30">&mdash;</p>
        ) : (
          <div className="mt-2 space-y-0.5">
            {amounts.map((a, i) => (
              <p
                key={a}
                className={
                  i === 0
                    ? "tabular text-3xl leading-tight font-semibold text-white"
                    : "tabular text-lg leading-tight font-semibold text-white/60"
                }
              >
                {a}
              </p>
            ))}
          </div>
        )}
        {caption && <p className="mt-1.5 text-sm text-white/40">{caption}</p>}
      </div>
    </div>
  );
}

/** Status filter chips, driven by the query string so they survive a reload. */
export function Filters({
  base,
  current,
  options,
}: {
  base: string;
  current: string | undefined;
  options: { value: string; label: string; count: number }[];
}) {
  const all = options.reduce((n, o) => n + o.count, 0);
  const chip = (active: boolean) =>
    "rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors " +
    (active
      ? "bg-gold text-[#042115]"
      : "bg-white/[0.06] text-white/60 hover:bg-white/10 hover:text-white");

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={base} className={chip(!current)}>
        All {all}
      </Link>
      {options
        .filter((o) => o.count > 0)
        .map((o) => (
          <Link
            key={o.value}
            href={`${base}?status=${o.value}`}
            className={chip(current === o.value)}
          >
            {o.label} {o.count}
          </Link>
        ))}
    </div>
  );
}

/** A table that scrolls sideways on a narrow screen instead of squashing. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[46rem] text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: boolean;
}) {
  return (
    <th
      scope="col"
      className={`border-b border-white/8 px-3 py-2.5 text-[0.68rem] font-semibold tracking-widest text-white/40 uppercase ${
        right ? "text-right" : ""
      }`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  right,
  muted,
}: {
  children: React.ReactNode;
  right?: boolean;
  muted?: boolean;
}) {
  return (
    <td
      className={`border-b border-white/[0.06] px-3 py-3.5 align-middle ${
        right ? "text-right" : ""
      } ${muted ? "text-white/45" : "text-white/80"}`}
    >
      {children}
    </td>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-white/40">{children}</p>;
}
