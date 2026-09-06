import Image from "next/image";

/**
 * A photograph, or a typographic tile where none exists yet.
 *
 * The fallback is deliberate rather than a placeholder. A site part way
 * through being photographed should look composed, not broken, and a grey box
 * with a camera icon reads as unfinished to a client and to a buyer.
 */
export function Photo({
  src,
  alt,
  label,
  className = "",
  sizes = "(min-width: 1024px) 33vw, 100vw",
  priority = false,
}: {
  src: string | null;
  alt: string;
  /** Shown on the fallback tile when there is no photograph. */
  label: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (!src) {
    return (
      <div
        className={`relative flex items-end overflow-hidden bg-forest ${className}`}
        aria-hidden="true"
      >
        {/* A quiet field pattern, so an unphotographed tile still has texture. */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, transparent 0 14px, rgba(208,141,29,0.55) 14px 15px)",
          }}
        />
        <span className="relative p-4 text-sm leading-snug text-sand">
          {label}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-sand ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
