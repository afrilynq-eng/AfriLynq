import Link from "next/link";
import type { CarrierAccount } from "@/lib/carrier";

/**
 * The frame around every carrier page.
 *
 * Deliberately not the buyer site's chrome and not the admin's either. A
 * haulier signing in should be able to tell at a glance that this is a
 * partner tool, and the badge in the header is doing that work.
 */
export default function CarrierShell({
  account,
  title,
  intro,
  back,
  children,
}: {
  account: CarrierAccount;
  title: string;
  intro?: string;
  back?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-sand text-ink">
      <header className="flex h-[70px] items-center gap-4 bg-forest px-5 text-white sm:px-10">
        <Link href="/carrier" className="text-xl font-extrabold tracking-tight">
          Afri<span className="text-gold">Lynq</span>
        </Link>
        <span className="rounded-md bg-gold px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#04281a]">
          Carrier portal
        </span>
        <div className="ml-auto hidden text-right text-[13px] text-white/75 sm:block">
          <div>
            Signed in as <b className="text-white">{account.carrierName}</b>
          </div>
          {account.email ? (
            <div className="text-[11.5px] text-white/50">{account.email}</div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-10">
        {back ? (
          <Link
            href={back.href}
            className="mb-4 inline-block text-[13px] font-semibold text-forest hover:underline"
          >
            {back.label}
          </Link>
        ) : null}

        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {intro ? (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone">{intro}</p>
        ) : null}

        {children}
      </main>

      <footer className="mx-auto w-full max-w-6xl px-5 pb-12 text-[12px] text-stone sm:px-10">
        Questions about a job go to AfriLynq, not to the supplier or the buyer.
      </footer>
    </div>
  );
}

/** A titled box. */
export function Card({
  title,
  count,
  note,
  children,
}: {
  title: string;
  count?: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-sand-deep bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-sand-deep px-6 py-4">
        <h2 className="text-[15px] font-extrabold">{title}</h2>
        {count ? (
          <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-extrabold text-[#a97014]">
            {count}
          </span>
        ) : null}
        {note ? <span className="ml-auto text-[12.5px] text-stone">{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

/** A short explanatory block with a gold rule down the left. */
export function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="m-6 rounded-r-lg border-l-4 border-gold bg-sand px-5 py-4">
      <div className="text-[13.5px] font-extrabold text-forest">{title}</div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}

export function Field({
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
      <span className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-stone">
        {label}
      </span>
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-1.5 text-[12px] text-stone">{hint}</p> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-sand-deep bg-sand px-3.5 py-2.5 text-sm " +
  "text-ink outline-none focus:border-forest focus:ring-1 focus:ring-forest";

export const buttonClass =
  "inline-block rounded-lg bg-gold px-4 py-2.5 text-[13px] font-extrabold " +
  "text-[#04281a] transition hover:brightness-105 disabled:opacity-50";

export const ghostButtonClass =
  "inline-block rounded-lg border border-sand-deep px-4 py-2.5 text-[13px] " +
  "font-bold text-ink-soft transition hover:bg-sand";

/** Money, from minor units, without inventing a symbol we do not know. */
export function money(minor: number | null, currency: string | null): string {
  if (minor == null) return "Not agreed";
  return `${currency ?? ""} ${(minor / 100).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`.trim();
}

export function when(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
