import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28">
      <h1 className="text-4xl sm:text-5xl">That page is not here</h1>
      <p className="mt-5 max-w-lg leading-relaxed text-ink-soft">
        The link may be out of date, or the page may have moved. Start from what we
        source, or tell us what you were looking for.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/categories" className="btn-primary">
          See what we source
        </Link>
        <Link href="/contact" className="link-quiet py-3 text-ink-soft">
          Contact us
        </Link>
      </div>
    </section>
  );
}
