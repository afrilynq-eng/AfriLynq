"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveInterests } from "@/app/(site)/account/settings/actions";

/**
 * What you are looking for.
 *
 * The same question the sign-up form asked, available again afterwards.
 * It is here rather than on the company screen because it belongs to the
 * person: a shopper has no company, and a buyer's interests are not the
 * same thing as their company profile.
 *
 * Checkboxes rather than a multi-select. The list is short enough to read
 * at a glance and a multi-select on a phone is a small cruelty.
 */
export default function InterestsForm({
  categories,
  selected,
  heading,
  hint,
}: {
  categories: { slug: string; name: string }[];
  selected: string[];
  heading: string;
  hint: string;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(selected);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function toggle(slug: string) {
    setNote("");
    setPicked((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNote("");

    const result = await saveInterests(picked).catch(() => ({
      ok: false as const,
      message: "Could not reach the server. Try again.",
    }));

    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setNote("Saved.");
    router.refresh();
  }

  if (categories.length === 0) return null;

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm"
    >
      <h2 className="text-xl">{heading}</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">{hint}</p>

      <div className="mt-5 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => {
          const on = picked.includes(c.slug);
          return (
            <label
              key={c.slug}
              className="flex cursor-pointer items-center gap-2.5 text-sm text-ink"
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(c.slug)}
                className="h-4 w-4 shrink-0 accent-[#1f5134]"
              />
              {c.name}
            </label>
          );
        })}
      </div>

      {error && (
        <p className="mt-5 rounded-lg border-l-2 border-gold bg-sand/60 px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="btn-lift btn-primary disabled:opacity-60">
          {busy ? "Saving" : "Save"}
        </button>
        {note && <span className="text-sm text-forest">{note}</span>}
      </div>
    </form>
  );
}
