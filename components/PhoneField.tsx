"use client";

import { useState } from "react";
import { DIAL_CODES, COMMON_DIAL_CODES, DEFAULT_DIAL } from "@/lib/dial-codes";

/**
 * A phone number as a dialling code and a local number.
 *
 * The forms used to ask for one text field with "+234" sitting in the
 * placeholder. Two things were wrong with that. A placeholder is a hint,
 * not a value, so plenty of people typed their number without any code at
 * all and we stored a number nobody could ring. And on an international
 * platform, pre-suggesting Nigeria told every other visitor that the site
 * was not really for them.
 *
 * So: a picker of every dialling code there is, and a box for the rest of
 * the number.
 *
 * The forms that use this all read their values out of FormData, so the
 * two visible controls are unnamed and a hidden input carries the joined
 * value under the name the form already expects. Nothing on the server
 * side changes, and no form had to learn about this component beyond
 * rendering it.
 */

const COMMON = COMMON_DIAL_CODES.map((c) => DIAL_CODES.find((d) => d.code === c)).filter(
  (d): d is (typeof DIAL_CODES)[number] => Boolean(d)
);

/**
 * Split a stored number back into a code and a local part.
 *
 * Longest match wins, so +1 does not swallow a +1264. Where the guess is
 * wrong, and with +1 it sometimes will be, nothing is lost: the two parts
 * are joined back together on submit and come to the same number.
 */
function split(value: string | undefined, fallback: string) {
  const raw = (value ?? "").trim();
  if (!raw.startsWith("+")) {
    return { code: fallback, local: raw };
  }
  const digits = raw.slice(1).replace(/\s+/g, "");
  const match = [...DIAL_CODES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((d) => digits.startsWith(d.dial));

  if (!match) return { code: fallback, local: raw.slice(1) };
  return { code: match.code, local: digits.slice(match.dial.length) };
}

const DEFAULT_LABEL = "block text-sm font-medium text-ink";
const DEFAULT_FIELD =
  "rounded-lg border border-sand-deep bg-paper px-4 py-3 text-ink outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/30";
const DEFAULT_HINT = "mt-1.5 block text-xs text-stone";

export default function PhoneField({
  name = "phone",
  label = "Phone number",
  defaultCountry,
  defaultValue,
  required = false,
  hint,
  id = "phone",
  labelClass = DEFAULT_LABEL,
  fieldClass = DEFAULT_FIELD,
  hintClass = DEFAULT_HINT,
}: {
  name?: string;
  label?: string;
  /** ISO code to preselect, usually whatever country the form already knows. */
  defaultCountry?: string | null;
  defaultValue?: string;
  required?: boolean;
  hint?: string;
  id?: string;
  /**
   * Each form that uses this styles its labels and inputs its own way,
   * one in small caps and another in sentence case. Passing the classes
   * in keeps this field looking like a native part of whichever form it
   * is standing in, rather than the one row that came from elsewhere.
   */
  labelClass?: string;
  fieldClass?: string;
  hintClass?: string;
}) {
  const fallback =
    defaultCountry && DIAL_CODES.some((d) => d.code === defaultCountry)
      ? defaultCountry
      : DEFAULT_DIAL;

  const initial = split(defaultValue, fallback);
  const [country, setCountry] = useState(initial.code);
  const [local, setLocal] = useState(initial.local);

  const dial = DIAL_CODES.find((d) => d.code === country)?.dial ?? "";
  const trimmed = local.trim();
  const joined = trimmed ? `+${dial} ${trimmed}` : "";

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required && <span className="text-gold"> *</span>}
      </label>

      {/*
        Country name first, then the code.

        It read "+234 Nigeria" at first, and in a narrow box that
        truncated to "+234 Niger", which is a different country with a
        different code. A picker that appears to show the wrong country
        is worse than no picker. With the name first, a long name
        truncates to an unmistakable prefix instead.

        On a phone the select takes its own line, because 240 country
        names and a number box do not share 390 pixels.
      */}
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`${id}-code`} className="sr-only">
          Country dialling code
        </label>
        <select
          id={`${id}-code`}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className={`${fieldClass} w-full shrink-0 sm:w-[11rem]`}
        >
          <optgroup label="Commonly used">
            {COMMON.map((d) => (
              <option key={`c-${d.code}`} value={d.code}>
                {d.name} +{d.dial}
              </option>
            ))}
          </optgroup>
          <optgroup label="All countries">
            {DIAL_CODES.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name} +{d.dial}
              </option>
            ))}
          </optgroup>
        </select>

        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required={required}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder="Rest of the number"
          className={`${fieldClass} min-w-0 flex-1`}
        />
      </div>

      {/* What the form actually submits. */}
      <input type="hidden" name={name} value={joined} />

      <span className={hintClass}>
        {hint ??
          (trimmed
            ? `Saved as ${joined}`
            : "Choose your country, then type the rest of the number")}
      </span>
    </div>
  );
}
