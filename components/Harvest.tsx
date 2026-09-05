import { MONTHS, type Availability } from "@/lib/content";

/**
 * Twelve month availability strip.
 *
 * Rendered on the server as plain markup so that the information is in the
 * HTML a search engine reads, not painted in afterwards by a script.
 */
export function Harvest({
  calendar,
  showScale = false,
  label,
}: {
  calendar: Availability[];
  showScale?: boolean;
  label: string;
}) {
  return (
    <div>
      <div className="harvest" role="img" aria-label={summarise(label, calendar)}>
        {calendar.map((state, i) => (
          <div key={i} className="harvest-cell" data-state={state} />
        ))}
      </div>
      {showScale && (
        <div className="harvest-scale mt-1.5 tabular" aria-hidden="true">
          {MONTHS.map((m) => (
            <span key={m} className="text-center">
              {m.charAt(0)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function summarise(label: string, calendar: Availability[]) {
  const peak = calendar
    .map((s, i) => (s === "peak" ? MONTHS[i] : null))
    .filter(Boolean);
  const any = calendar.map((s, i) => (s !== "none" ? MONTHS[i] : null)).filter(Boolean);
  if (peak.length === 0 && any.length === 12) return `${label}: available all year`;
  if (peak.length === 0) return `${label}: available ${any.join(", ")}`;
  return `${label}: peak season ${peak.join(", ")}, available ${any.join(", ")}`;
}

export function HarvestKey() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone">
      <span className="flex items-center gap-2">
        <span className="harvest-cell !h-3 w-6" data-state="peak" />
        Peak season
      </span>
      <span className="flex items-center gap-2">
        <span className="harvest-cell !h-3 w-6" data-state="available" />
        Available
      </span>
      <span className="flex items-center gap-2">
        <span className="harvest-cell !h-3 w-6" data-state="none" />
        Out of season
      </span>
    </div>
  );
}
