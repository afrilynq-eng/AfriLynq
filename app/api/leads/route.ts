import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/content";

export const runtime = "nodejs";

const VALID_CATEGORIES = new Set(CATEGORIES.map((c) => c.slug));

/**
 * Naive in memory rate limit, one window per instance. Good enough to stop a
 * script hammering the form from a single address; it is not a substitute for
 * a proper limiter, which should be added before the form is publicised.
 */
const seen = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function limited(ip: string) {
  const now = Date.now();
  const entry = seen.get(ip);

  if (!entry || entry.resetAt < now) {
    seen.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (limited(ip)) {
    return NextResponse.json(
      { message: "Too many submissions from this address. Try again shortly." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Could not read the form." }, { status: 400 });
  }

  // Honeypot. A real person never fills this in.
  if (typeof body.website === "string" && body.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const requested = String(body.leadType ?? "");
  const leadType = ["supplier", "buyer", "other"].includes(requested)
    ? requested
    : "buyer";
  const fullName = str(body.fullName);
  const email = str(body.email);

  if (!fullName || !email) {
    return NextResponse.json(
      { message: "Please give us your name and email." },
      { status: 400 }
    );
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json(
      { message: "That email address does not look right." },
      { status: 400 }
    );
  }

  const rawCategories = Array.isArray(body.categories)
    ? body.categories
    : body.categories
      ? [body.categories]
      : [];

  const categories = rawCategories
    .map((c) => String(c))
    .filter((c) => VALID_CATEGORIES.has(c));

  try {
    const supabase = serviceClient();
    const { error } = await supabase.from("leads").insert({
      lead_type: leadType,
      full_name: fullName.slice(0, 160),
      email: email.toLowerCase().slice(0, 254),
      phone: str(body.phone).slice(0, 40) || null,
      company_name: str(body.companyName).slice(0, 200) || null,
      country_code: str(body.countryCode).slice(0, 2).toUpperCase() || null,
      categories_of_interest: categories.length ? categories : null,
      message: str(body.message).slice(0, 4000) || null,
      source: str(body.source) || "website",
      utm: pick(body.utm),
    });

    if (error) {
      // A repeat submission from the same email and type is not an error the
      // person needs to see. The unique index is doing its job.
      if (error.code === "23505") return NextResponse.json({ ok: true });
      console.error("Lead insert failed", error);
      return NextResponse.json(
        { message: "We could not save that just now." },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Lead route failed", err);
    return NextResponse.json(
      { message: "We could not save that just now." },
      { status: 500 }
    );
  }

  // Notification email goes here once Resend is connected. Deliberately not
  // wired to a key that does not exist yet.
  return NextResponse.json({ ok: true });
}

function str(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function pick(value: unknown) {
  return value && typeof value === "object" ? value : {};
}
