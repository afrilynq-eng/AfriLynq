/**
 * Heading icons.
 *
 * Drawn inline rather than pulled from an icon package, so there is no new
 * dependency and the stroke weight matches the tick marks already used on the
 * home page. Every icon is a 24 unit square on a 1.6 stroke.
 */

export type IconName =
  | "mission"
  | "bridge"
  | "services"
  | "compass"
  | "sprout"
  | "globe"
  | "handshake";

const PATHS: Record<IconName, React.ReactNode> = {
  // Target, for the mission
  mission: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="12" r="4.6" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  // Two banks and a span, for the two sides of a trade
  bridge: (
    <>
      <path d="M3 15.5h18" />
      <path d="M3 15.5c3.4-6 14.6-6 18 0" />
      <path d="M7.6 12.2V19M12 10.6V19M16.4 12.2V19" />
    </>
  ),
  // Stacked cards, for the service lines
  services: (
    <>
      <rect x="3.2" y="4.2" width="7.2" height="7.2" rx="1.3" />
      <rect x="13.6" y="4.2" width="7.2" height="7.2" rx="1.3" />
      <rect x="3.2" y="12.6" width="7.2" height="7.2" rx="1.3" />
      <rect x="13.6" y="12.6" width="7.2" height="7.2" rx="1.3" />
    </>
  ),
  // Compass, for how we work
  compass: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M15.4 8.6l-2 5.4-5.4 2 2-5.4z" />
    </>
  ),
  // Seedling, for where we are
  sprout: (
    <>
      <path d="M12 20.5v-7.2" />
      <path d="M12 13.3C12 9.6 9.2 7.2 5.6 7.2c0 3.7 2.8 6.1 6.4 6.1z" />
      <path d="M12 13.3c0-3.1 2.4-5.2 5.5-5.2 0 3.1-2.4 5.2-5.5 5.2z" />
      <path d="M8.4 20.5h7.2" />
    </>
  ),
  // Globe, for the origins
  globe: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.4 12h17.2" />
      <path d="M12 3.4c2.3 2.4 3.5 5.4 3.5 8.6s-1.2 6.2-3.5 8.6c-2.3-2.4-3.5-5.4-3.5-8.6S9.7 5.8 12 3.4z" />
    </>
  ),
  // Clasped hands, for partnership
  handshake: (
    <>
      <path d="M3 10.4l3.4-3.1h4L13 9.6" />
      <path d="M21 10.4l-3.4-3.1h-3.2" />
      <path d="M13 9.6l-1.6 1.5a1.7 1.7 0 01-2.4 0 1.7 1.7 0 010-2.4" />
      <path d="M10.6 13.1l1.9 1.8M9 15l1.6 1.5M13.6 11.6l2.5 2.4" />
      <path d="M3 10.4v4.2l3 2.8M21 10.4v4.2l-2.6 2.4" />
    </>
  ),
};

export function HeadingIcon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <span
      className={
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-forest/10 text-forest " +
        className
      }
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {PATHS[name]}
      </svg>
    </span>
  );
}
