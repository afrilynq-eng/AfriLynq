"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES } from "@/lib/countries";
import { saveSettings } from "@/app/(site)/account/settings/actions";

interface Props {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  countryCode: string;
}

export default function SettingsForm(props: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "");

    setState("saving");
    setError("");

    const result = await saveSettings({
      firstName: text("firstName"),
      lastName: text("lastName"),
      phone: text("phone"),
      countryCode: text("countryCode"),
    }).catch(() => ({
      ok: false as const,
      message: "We could not reach the server just now. Please try again.",
    }));

    if (!result.ok) {
      setState("idle");
      setError(result.message);
      return;
    }

    setState("saved");
    // So the greeting in the portal header picks up a changed first name
    // without the person wondering why it still says the old one.
    router.refresh();
  }

  const label =
    "block text-[0.7rem] font-semibold tracking-widest text-forest uppercase";
  const field =
    "mt-2 w-full rounded-lg border border-sand-deep bg-paper px-4 py-3 text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30";

  return (
    <form onSubmit={submit} className="rounded-xl border border-sand-deep bg-paper p-7 shadow-sm">
      <h2 className="text-xl">Your details</h2>
      <p className="mt-2 text-sm text-ink-soft">
        This is you, not your company. Company details live on the company
        profile page.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label>
          <span className={label}>
            First name <span className="text-gold">*</span>
          </span>
          <input
            type="text"
            name="firstName"
            required
            defaultValue={props.firstName}
            autoComplete="given-name"
            className={field}
          />
        </label>

        <label>
          <span className={label}>
            Last name <span className="text-gold">*</span>
          </span>
          <input
            type="text"
            name="lastName"
            required
            defaultValue={props.lastName}
            autoComplete="family-name"
            className={field}
          />
        </label>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label>
          <span className={label}>Phone</span>
          <input
            type="tel"
            name="phone"
            defaultValue={props.phone}
            placeholder="Including country code"
            autoComplete="tel"
            className={field}
          />
        </label>

        <label>
          <span className={label}>Country</span>
          <select name="countryCode" defaultValue={props.countryCode} className={field}>
            <option value="">Not set</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Read only. Changing the address on an account is an authentication
          flow with a confirmation email, not a text box, so it is not
          pretended to be one here. */}
      <div className="mt-5">
        <span className={label}>Email address</span>
        <p className="mt-2 rounded-lg border border-sand-deep bg-sand px-4 py-3 text-ink-soft">
          {props.email ?? "Not set"}
        </p>
        <span className="mt-1.5 block text-xs text-stone">
          To change this, email info@afrilynq.co.uk. It is the address you sign
          in with.
        </span>
      </div>

      {error && (
        <p className="mt-5 rounded-lg border-l-2 border-gold bg-sand px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}

      {state === "saved" && !error && (
        <p className="mt-5 rounded-lg border-l-2 border-forest bg-sand px-4 py-3 text-sm text-ink">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={state === "saving"}
        className="btn-lift mt-6 rounded-lg bg-forest px-6 py-3 font-medium text-paper transition-colors hover:bg-gold hover:text-forest-deep disabled:opacity-60"
      >
        {state === "saving" ? "Saving" : "Save changes"}
      </button>
    </form>
  );
}
