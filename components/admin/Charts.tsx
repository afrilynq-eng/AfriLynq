/**
 * Charts drawn as server rendered SVG.
 *
 * Deliberately not a charting library. Two shapes on one screen does not
 * justify a dependency, and drawing them here keeps the admin area a server
 * component with nothing to hydrate.
 */

export function BarChart({
  data,
  height = 200,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = 4;

  if (data.every((d) => d.value === 0)) {
    return (
      <p className="py-10 text-center text-sm text-white/40">
        Nothing recorded yet. Submissions appear here as they arrive.
      </p>
    );
  }

  return (
    <div>
      <div className="flex gap-3" style={{ height }}>
        {/* Scale */}
        <div className="tabular flex w-8 shrink-0 flex-col justify-between pb-6 text-right text-[0.68rem] text-white/35">
          {Array.from({ length: ticks + 1 }, (_, i) => (
            <span key={i}>{Math.round((max * (ticks - i)) / ticks)}</span>
          ))}
        </div>

        <div className="relative flex flex-1 items-end gap-2 pb-6">
          {/* Grid lines */}
          <div className="absolute inset-x-0 bottom-6 top-0" aria-hidden="true">
            {Array.from({ length: ticks + 1 }, (_, i) => (
              <div
                key={i}
                className="absolute inset-x-0 border-t border-white/6"
                style={{ top: `${(i / ticks) * 100}%` }}
              />
            ))}
          </div>

          {data.map((d) => (
            <div key={d.label} className="relative flex flex-1 flex-col items-center">
              <div
                className="w-full rounded-t bg-gold/85"
                style={{ height: `${Math.max(2, (d.value / max) * (height - 24))}px` }}
                title={`${d.label}: ${d.value}`}
              />
              <span className="absolute -bottom-6 text-[0.68rem] text-white/40">
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Donut({
  segments,
  size = 190,
}: {
  segments: { label: string; value: number; colour: string }[];
  size?: number;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = size / 2 - 16;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return (
      <p className="py-10 text-center text-sm text-white/40">
        Nothing recorded yet.
      </p>
    );
  }

  let offset = 0;

  return (
    <div className="flex flex-wrap items-center justify-center gap-8">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(", ")}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {segments.map((s) => {
            const length = (s.value / total) * circumference;
            const dash = `${length} ${circumference - length}`;
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={s.colour}
                strokeWidth={22}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return el;
          })}
        </g>
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          className="tabular"
          fill="#fff"
          fontSize="26"
          fontWeight="600"
        >
          {total}
        </text>
        <text x="50%" y="60%" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="11">
          total
        </text>
      </svg>

      <ul className="space-y-2 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-white/70">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: s.colour }}
              aria-hidden="true"
            />
            {s.label}
            <span className="tabular ml-auto pl-4 text-white">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
