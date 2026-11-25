/**
 * CSV, built the same way everywhere.
 *
 * The leads export has its own copy of this, written before there was
 * anywhere to share it from. It is left alone rather than refactored,
 * because it works and this is not the week to go changing it; the money
 * exports share this one instead of adding two more copies.
 *
 * The formula guard is not optional: a cell beginning =, +, - or @ is
 * executed by Excel when the file is opened, which turns a downloadable
 * report into a way of running something on an administrator's machine.
 */

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) ? value.join("; ") : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function csvBody(
  columns: readonly string[],
  rows: readonly Record<string, unknown>[]
): string {
  const lines = rows.map((row) => columns.map((c) => csvCell(row[c])).join(","));
  return [columns.join(","), ...lines].join("\r\n");
}

/**
 * The byte order mark is what makes Excel read it as UTF-8. Without it a
 * supplier called Côte d'Or Négoce arrives mangled.
 */
export function csvResponse(csv: string, name: string): Response {
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="afrilynq-${name}-${stamp}.csv"`,
    },
  });
}

/** Minor units to a plain decimal, which is what a spreadsheet wants. */
export function majorUnits(minor: number | null | undefined, scale = 2): string {
  if (minor === null || minor === undefined) return "";
  return (minor / 10 ** scale).toFixed(scale);
}
