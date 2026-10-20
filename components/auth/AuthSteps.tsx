/**
 * The three steps across the top of sign-up and verification.
 *
 * Account created, Verify your email, Add your company. It exists so the
 * person knows the email code is not the end of it, which is the point at
 * which people otherwise stop.
 */

const STEPS = ["Account created", "Verify your email", "Add your company"];

function Tick() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AuthSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mx-auto flex max-w-xl items-start">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const now = n === current;

        return (
          <li
            key={label}
            className={
              "flex flex-1 flex-col items-center gap-2 " +
              (i === 0 ? "items-start" : i === STEPS.length - 1 ? "items-end" : "")
            }
          >
            <div className="flex w-full items-center gap-2">
              {i > 0 && (
                <span
                  className={
                    "h-0.5 flex-1 rounded " + (done || now ? "bg-forest/40" : "bg-sand-deep")
                  }
                />
              )}
              <span
                className={
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold " +
                  (done
                    ? "bg-forest text-paper"
                    : now
                      ? "bg-gold text-forest-deep"
                      : "bg-sand-deep text-stone")
                }
              >
                {done ? <Tick /> : n}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  className={"h-0.5 flex-1 rounded " + (done ? "bg-forest/40" : "bg-sand-deep")}
                />
              )}
            </div>
            <span
              className={
                "text-center text-xs leading-snug " +
                (now ? "font-semibold text-forest" : done ? "text-ink-soft" : "text-stone")
              }
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
