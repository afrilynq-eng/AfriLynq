/**
 * Social platform icons.
 *
 * Drawn inline rather than pulled from an icon package, so there is no new
 * dependency, no extra request and the marks stay crisp at any size. Each is
 * a 24 unit square using the platform's own glyph shape.
 */

export type SocialName =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "x"
  | "youtube"
  | "tiktok";

const GLYPHS: Record<SocialName, React.ReactNode> = {
  facebook: (
    <path
      fill="currentColor"
      d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.63A22 22 0 0 0 14.3 3.5c-2.4 0-4 1.46-4 4.14V9.9H7.6V13h2.7v8z"
    />
  ),
  instagram: (
    <>
      <rect
        x="3.4"
        y="3.4"
        width="17.2"
        height="17.2"
        rx="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle
        cx="12"
        cy="12"
        r="3.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="16.9" cy="7.1" r="1.15" fill="currentColor" />
    </>
  ),
  linkedin: (
    <>
      <path
        fill="currentColor"
        d="M6.94 8.9H4.2V20h2.74zM5.57 4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z"
      />
      <path
        fill="currentColor"
        d="M14.6 8.68c-1.48 0-2.3.73-2.72 1.4V8.9H9.14c.04.79 0 11.1 0 11.1h2.74v-6.05c0-.26.02-.51.1-.7.2-.5.67-1.03 1.47-1.03 1.04 0 1.5.78 1.5 1.93V20h2.75v-6.17c0-2.6-1.37-3.81-3.1-3.81z"
      />
    </>
  ),
  x: (
    <path
      fill="currentColor"
      d="M17.2 3.75h2.9l-6.35 7.26L21.25 20.5h-5.9l-4.6-6.02-5.28 6.02H2.56l6.8-7.77L2.75 3.75h6.05l4.16 5.5zm-1.02 15h1.6L8.1 5.4H6.38z"
    />
  ),
  tiktok: (
    <path
      fill="currentColor"
      d="M16.02 2.5h-2.9v12.06a2.32 2.32 0 1 1-1.9-2.28V9.3a5.25 5.25 0 1 0 4.8 5.23V8.45a6.1 6.1 0 0 0 3.6 1.17V6.71a3.55 3.55 0 0 1-3.6-4.21z"
    />
  ),
  youtube: (
    <>
      <rect
        x="2.6"
        y="5.6"
        width="18.8"
        height="12.8"
        rx="3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path fill="currentColor" d="M10.3 9.1v5.8L15.4 12z" />
    </>
  ),
};

export function SocialIcon({ name }: { name: SocialName }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" aria-hidden="true">
      {GLYPHS[name]}
    </svg>
  );
}
