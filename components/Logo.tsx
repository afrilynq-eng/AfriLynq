import Image from "next/image";
import mark from "@/public/brand/mark.png";
import wordmark from "@/public/brand/wordmark.png";
import tile from "@/public/brand/tile.png";
import markReverse from "@/public/brand/mark-reverse.png";
import wordmarkReverse from "@/public/brand/wordmark-reverse.png";

/**
 * Horizontal lockup for light backgrounds: the mark beside the wordmark, with
 * the strapline set in type underneath.
 *
 * The source artwork is a stacked lockup, so the horizontal arrangement is
 * assembled here from the two elements rather than cropped from a composite.
 * When AfriLynq supplies the vector files, replace these images with inline
 * SVG and delete the PNGs.
 */
export function Logo({
  showStrapline = true,
  className = "",
}: {
  showStrapline?: boolean;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Image src={mark} alt="" width={44} height={34} priority className="h-9 w-auto" />
      <span className="flex flex-col">
        <Image
          src={wordmark}
          alt="AfriLynq"
          width={451}
          height={112}
          priority
          className="h-[1.35rem] w-auto"
        />
        {showStrapline && (
          <span className="mt-0.5 text-[0.5rem] leading-tight tracking-[0.06em] text-forest">
            Connecting African Harvests
            <br />
            to Global Markets
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * Reversed lockup for dark grounds. The standard mark is dark green, which
 * disappears against the deep green used in the footer and the trust band, so
 * this uses the white and gold artwork from the app icon instead.
 */
export function LogoReverse({
  showStrapline = true,
  className = "",
}: {
  showStrapline?: boolean;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <Image src={markReverse} alt="" width={256} height={146} className="h-11 w-auto" />
      <span className="flex flex-col">
        <Image
          src={wordmarkReverse}
          alt="AfriLynq"
          width={217}
          height={45}
          className="h-6 w-auto"
        />
        {showStrapline && (
          <span className="mt-1 text-[0.5625rem] leading-tight tracking-[0.06em] text-sand-deep">
            Connecting African Harvests
            <br />
            to Global Markets
          </span>
        )}
      </span>
    </span>
  );
}

/** The app icon badge, for square placements such as an avatar or share card. */
export function LogoBadge({ className = "" }: { className?: string }) {
  return (
    <Image
      src={tile}
      alt="AfriLynq"
      width={256}
      height={253}
      className={className}
    />
  );
}
