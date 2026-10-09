import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Request scoped Supabase client that carries the signed in user's session.
 *
 * Every query made through this client runs under that user's row level
 * security policies, which is the point. The service role client in
 * lib/supabase.ts bypasses them and must never be used to serve a page.
 */
export function isConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function sessionClient() {
  const store = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) =>
              store.set(name, value, options)
            );
          } catch {
            // Called from a server component, where cookies are read only.
            // Middleware refreshes the session instead.
          }
        },
      },
    }
  );
}

/**
 * Returns the signed in user only if they are a platform administrator.
 *
 * The check reads platform_role from the profiles table rather than trusting
 * anything in the session, because a JWT claim can be stale and a role is not
 * something the client should be able to assert about itself.
 */
export async function requireAdmin() {
  if (!isConfigured()) return null;
  const supabase = await sessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, platform_role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.platform_role !== "admin") return null;
  return profile;
}

/* ------------------------------------------------------------------
   Stage 2: accounts for everyone, not just administrators
   ------------------------------------------------------------------ */

export interface CurrentUser {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_path: string | null;
  platform_role: string;
  country_code: string | null;
}

/**
 * The signed in user's profile, whoever they are.
 *
 * Unlike requireAdmin this makes no claim about privilege. It answers one
 * question: is somebody signed in, and who. Pages decide what that entitles
 * them to.
 */
export async function currentUser(): Promise<CurrentUser | null> {
  if (!isConfigured()) return null;
  const supabase = await sessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, first_name, last_name, phone, avatar_path, platform_role, country_code"
    )
    .eq("id", user.id)
    .single();

  return (data as CurrentUser) ?? null;
}

/**
 * What to call someone.
 *
 * first_name where we have it, the leading word of full_name for the accounts
 * created before the name was split, and "there" when we have neither rather
 * than an empty greeting.
 */
export function greetingName(user: CurrentUser | null): string {
  if (!user) return "there";
  const first = user.first_name?.trim();
  if (first) return first;
  const legacy = user.full_name?.trim().split(/\s+/)[0];
  return legacy || "there";
}

export interface MemberCompany {
  id: string;
  slug: string | null;
  legal_name: string;
  trading_name: string | null;
  company_type: string;
  verification_status: string;
  verification_notes: string | null;
  is_listed: boolean;
  logo_path: string | null;
  country_code: string | null;
  /** The signed in user's role in this company: owner, admin or member. */
  member_role: string;
}

/**
 * Every company the signed in user actively belongs to.
 *
 * Invited but not yet accepted members are excluded, because an invitation is
 * not membership and the policies treat it that way too.
 *
 * Returns an empty array rather than null when nobody is signed in, so callers
 * can map over the result without a guard.
 */
export async function userCompanies(): Promise<MemberCompany[]> {
  if (!isConfigured()) return [];
  const supabase = await sessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) return [];

  const { data } = await supabase
    .from("company_members")
    .select(
      `member_role,
       company:company_id (
         id, slug, legal_name, trading_name, company_type,
         verification_status, verification_notes, is_listed,
         logo_path, country_code
       )`
    )
    .eq("user_id", user.id)
    .eq("status", "active");

  if (!data) return [];

  // Supabase types an embedded one-to-one as an array. It is a single row
  // here because company_id is a foreign key, so flatten it.
  return data.flatMap((row) => {
    const raw = row as unknown as {
      member_role: string;
      company: Omit<MemberCompany, "member_role"> | Omit<MemberCompany, "member_role">[] | null;
    };
    const company = Array.isArray(raw.company) ? raw.company[0] : raw.company;
    return company ? [{ ...company, member_role: raw.member_role }] : [];
  });
}

export interface Certification {
  id: string;
  company_id: string;
  name: string;
  issuing_body: string | null;
  reference: string | null;
  document_path: string | null;
  issued_on: string | null;
  expires_on: string | null;
  status: string;
  review_notes: string | null;
  created_at: string;
}

/**
 * Documents held against one company.
 *
 * certifications_member_read already limits this to companies the signed in
 * user belongs to, so there is no membership check here. Passing a company id
 * that is not theirs returns nothing rather than an error, which is how row
 * level security is meant to behave.
 */
export async function companyCertifications(
  companyId: string
): Promise<Certification[]> {
  if (!isConfigured()) return [];
  const supabase = await sessionClient();

  const { data } = await supabase
    .from("certifications")
    .select(
      "id, company_id, name, issuing_body, reference, document_path, issued_on, expires_on, status, review_notes, created_at"
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  return (data as Certification[]) ?? [];
}

/**
 * How many documents each of these companies holds.
 *
 * One query for all of them rather than one per company, because the portal
 * header needs this on every page and the count is only used to decide
 * whether a step in the progress strip is done.
 */
export async function certificationCounts(
  companyIds: string[]
): Promise<Record<string, number>> {
  if (!isConfigured() || companyIds.length === 0) return {};
  const supabase = await sessionClient();

  const { data } = await supabase
    .from("certifications")
    .select("company_id")
    .in("company_id", companyIds);

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { company_id: string }[]) {
    counts[row.company_id] = (counts[row.company_id] ?? 0) + 1;
  }
  return counts;
}
