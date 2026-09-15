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
  | "handshake"
  | "sourcing"
  | "verified"
  | "trade-support"
  | "connections"
  | "facilitation"
  | "logistics";

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
  // Produce in a circle, for agricultural product sourcing
  sourcing: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M15.8 8.6c0 3.9-2.5 5.8-5.3 5.8-1.1 0-2-.3-2-.3s-.2-3.4 3.5-4.4c1.7-.5 3.8-1.1 3.8-1.1z" />
      <path d="M13.4 10.2c-2.3 1-3.9 2.9-4.8 5.7" />
    </>
  ),
  // Shield with a tick, for supplier verification
  verified: (
    <>
      <path d="M12 3.2l6.6 2.4v5.2c0 4.1-2.8 7.6-6.6 9-3.8-1.4-6.6-4.9-6.6-9V5.6z" />
      <path d="M8.9 11.8l2.2 2.2 4-4.3" />
    </>
  ),
  // Globe with exchange arrows, for import and export support
  "trade-support": (
    <>
      <circle cx="12" cy="12" r="6.4" />
      <path d="M5.6 12h12.8" />
      <path d="M12 5.6c1.8 1.8 2.7 4 2.7 6.4s-.9 4.6-2.7 6.4c-1.8-1.8-2.7-4-2.7-6.4S10.2 7.4 12 5.6z" />
      <path d="M19.4 6.4l1.6 1.8-1.8 1.6M4.6 17.6L3 15.8l1.8-1.6" />
    </>
  ),
  // Linked nodes, for business connections
  connections: (
    <>
      <circle cx="6" cy="7" r="2.4" />
      <circle cx="18" cy="7" r="2.4" />
      <circle cx="12" cy="17.4" r="2.4" />
      <path d="M7.7 8.8l3 6.6M16.3 8.8l-3 6.6M8.4 7h7.2" />
    </>
  ),
  // Lorry, for trade facilitation
  facilitation: (
    <>
      <path d="M2.8 6.6h9.6v8.8H2.8z" />
      <path d="M12.4 9.4h3.6l3.2 3v3h-6.8z" />
      <circle cx="6.6" cy="17.4" r="1.7" />
      <circle cx="16.4" cy="17.4" r="1.7" />
    </>
  ),
  // Container ship, for logistics partnerships
  logistics: (
    <>
      <path d="M3 14.6h17l-1.8 4.2a1.6 1.6 0 01-1.5 1H6.3a1.6 1.6 0 01-1.5-1z" />
      <path d="M5.6 14.6V10h9.2v4.6" />
      <path d="M8.2 10V7.2h3.4V10" />
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

/**
 * Heading icon.
 *
 * Sits above its heading rather than beside it, and is drawn on a heavy stroke
 * so it reads at a glance. `tone` picks the ground: forest for a pale section,
 * gold for the ones that should carry weight.
 */
export function HeadingIcon({
  name,
  tone = "forest",
  size = "md",
  className = "",
}: {
  name: IconName;
  tone?: "forest" | "gold";
  size?: "sm" | "md";
  className?: string;
}) {
  const box =
    size === "sm" ? "h-12 w-12 rounded-xl" : "h-14 w-14 rounded-xl";
  const ground =
    tone === "gold"
      ? "bg-gold text-forest-deep"
      : "bg-forest text-paper";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center shadow-sm ${box} ${ground} ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        className={size === "sm" ? "h-6 w-6" : "h-7 w-7"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {PATHS[name]}
      </svg>
    </span>
  );
}
