import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RegisterForm from "@/components/RegisterForm";

const KINDS = {
  retailer: {
    kind: "buyer" as const,
    title: "Join AfriLynq as a retailer",
    lede: "Tell us what you need to source. Free, and we come back to you by email.",
    back: { href: "/for-retailers", label: "For retailers" },
  },
  farmer: {
    kind: "supplier" as const,
    title: "Join AfriLynq as a farmer or exporter",
    lede: "Tell us what you supply and where you export from. Free to register.",
    back: { href: "/for-farmers", label: "For farmers" },
  },
};

export function generateStaticParams() {
  return Object.keys(KINDS).map((kind) => ({ kind }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kind: string }>;
}): Promise<Metadata> {
  const { kind } = await params;
  const entry = KINDS[kind as keyof typeof KINDS];
  if (!entry) return {};
  return {
    title: entry.title,
    description: entry.lede,
    alternates: { canonical: `/register/${kind}` },
  };
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  const entry = KINDS[kind as keyof typeof KINDS];
  if (!entry) notFound();

  return (
    <div className="bg-sand">
      <section className="mx-auto max-w-3xl px-6 pt-10 pb-16">
        <nav aria-label="Breadcrumb" className="text-sm text-stone">
          <Link href={entry.back.href} className="link-quiet">
            {entry.back.label}
          </Link>
          <span className="px-2">/</span>
          <span className="text-ink-soft">Register</span>
        </nav>

        <div className="mt-7 text-center">
          <h1 className="text-3xl sm:text-4xl">{entry.title}</h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-ink-soft">{entry.lede}</p>
        </div>

        <div className="mt-9">
          <RegisterForm kind={entry.kind} />
        </div>
      </section>
    </div>
  );
}
