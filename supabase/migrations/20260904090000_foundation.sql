-- AfriLynq platform
-- Migration 0001: foundation
-- Extensions, enums, reference data, identity, companies, membership, helper functions.
--
-- Design rules enforced here:
--   1. The unit of the marketplace is a company, not a user.
--   2. Country, currency and unit of measure are data, not hard-coded lists (spec s21).
--   3. Row level security is enabled on every table in this migration, not later.
--   4. Helper functions are SECURITY DEFINER so that policies can read membership
--      without triggering infinite recursion on the tables they protect.

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";

create schema if not exists app;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type app.platform_role as enum ('user', 'admin');

create type app.company_type as enum ('supplier', 'buyer', 'both');

create type app.verification_status as enum (
  'unverified',
  'pending',
  'verified',
  'rejected',
  'suspended'
);

create type app.member_role as enum ('owner', 'admin', 'member');

create type app.member_status as enum ('invited', 'active', 'removed');

create type app.product_status as enum ('draft', 'active', 'archived');

create type app.enquiry_status as enum ('open', 'quoted', 'closed', 'cancelled');

create type app.quotation_status as enum (
  'draft',
  'sent',
  'accepted',
  'rejected',
  'revision_requested',
  'expired'
);

create type app.order_status as enum (
  'confirmed',
  'in_production',
  'shipped',
  'in_transit',
  'delivered',
  'completed',
  'cancelled',
  'disputed'
);

create type app.certification_status as enum ('pending', 'verified', 'rejected', 'expired');

-- ---------------------------------------------------------------------------
-- Shared trigger: updated_at
-- ---------------------------------------------------------------------------

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reference data
-- Countries, currencies and units live in tables so that adding Kenya or a new
-- unit of measure is an insert, not a deployment.
-- ---------------------------------------------------------------------------

create table public.countries (
  code            char(2) primary key,
  name            text not null,
  region          text,
  dial_code       text,
  is_supplier_market  boolean not null default false,
  is_buyer_market     boolean not null default false,
  is_active       boolean not null default true,
  sort_order      integer not null default 100
);

create table public.currencies (
  code            char(3) primary key,
  name            text not null,
  symbol          text not null,
  minor_units     smallint not null default 2,
  is_active       boolean not null default true
);

create table public.units (
  code            text primary key,
  name            text not null,
  plural_name     text not null,
  unit_family     text not null,
  is_active       boolean not null default true,
  sort_order      integer not null default 100
);

-- ---------------------------------------------------------------------------
-- Profiles
-- One row per authenticated person. Platform role is deliberately separate from
-- company role: being an admin of a company must never imply platform admin.
-- ---------------------------------------------------------------------------

create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  full_name       text,
  phone           text,
  avatar_path     text,
  platform_role   app.platform_role not null default 'user',
  country_code    char(2) references public.countries(code),
  locale          text not null default 'en-GB',
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (lower(email));

create trigger profiles_touch
  before update on public.profiles
  for each row execute function app.touch_updated_at();

-- Create the profile row automatically when Supabase Auth creates the user.
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- ---------------------------------------------------------------------------
-- Companies
-- Everything commercial hangs off this table. A company can be a supplier, a
-- buyer, or both, which is common in agricultural trade.
-- ---------------------------------------------------------------------------

create table public.companies (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  legal_name            text not null,
  trading_name          text,
  company_type          app.company_type not null,
  registration_number   text,
  tax_number            text,
  country_code          char(2) not null references public.countries(code),
  state_or_region       text,
  city                  text,
  address_line1         text,
  address_line2         text,
  postcode              text,
  contact_email         text,
  contact_phone         text,
  website_url           text,
  logo_path             text,
  cover_image_path      text,
  short_description     text,
  about                 text,
  year_established      smallint,
  employee_band         text,
  verification_status   app.verification_status not null default 'unverified',
  verified_at           timestamptz,
  verified_by           uuid references public.profiles(id),
  verification_notes    text,
  is_listed             boolean not null default false,
  response_rate         numeric(5,2),
  created_by            uuid references public.profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint companies_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index companies_type_idx on public.companies (company_type);
create index companies_country_idx on public.companies (country_code);
create index companies_verification_idx on public.companies (verification_status);
create index companies_listed_idx on public.companies (is_listed) where is_listed = true;
create index companies_name_trgm_idx on public.companies using gin (legal_name gin_trgm_ops);

create trigger companies_touch
  before update on public.companies
  for each row execute function app.touch_updated_at();

-- A company only becomes publicly visible when it is both verified and listed.
create or replace function app.company_is_public(cid uuid)
returns boolean
language sql
security definer
set search_path = public, app
stable
as $$
  select exists (
    select 1
    from public.companies c
    where c.id = cid
      and c.verification_status = 'verified'
      and c.is_listed = true
  );
$$;

-- ---------------------------------------------------------------------------
-- Company membership
-- ---------------------------------------------------------------------------

create table public.company_members (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  member_role     app.member_role not null default 'member',
  status          app.member_status not null default 'active',
  invited_email   text,
  invited_by      uuid references public.profiles(id),
  joined_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (company_id, user_id)
);

create index company_members_user_idx on public.company_members (user_id) where status = 'active';
create index company_members_company_idx on public.company_members (company_id) where status = 'active';

create trigger company_members_touch
  before update on public.company_members
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Helper functions used by every policy in migration 0005
--
-- These are SECURITY DEFINER on purpose. A policy on company_members that reads
-- company_members recurses forever. A definer function bypasses RLS for that
-- one lookup and breaks the loop. Keep them small and keep search_path pinned.
-- ---------------------------------------------------------------------------

create or replace function app.is_platform_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public, app
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.platform_role = 'admin'
  );
$$;

create or replace function app.company_ids_for(uid uuid default auth.uid())
returns setof uuid
language sql
security definer
set search_path = public, app
stable
as $$
  select m.company_id
  from public.company_members m
  where m.user_id = uid
    and m.status = 'active';
$$;

create or replace function app.is_member_of(cid uuid, uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public, app
stable
as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = cid
      and m.user_id = uid
      and m.status = 'active'
  );
$$;

create or replace function app.is_company_admin(cid uuid, uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public, app
stable
as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = cid
      and m.user_id = uid
      and m.status = 'active'
      and m.member_role in ('owner', 'admin')
  );
$$;

grant usage on schema app to authenticated, anon;
grant execute on function
  app.is_platform_admin(uuid),
  app.company_ids_for(uuid),
  app.is_member_of(uuid, uuid),
  app.is_company_admin(uuid, uuid),
  app.company_is_public(uuid)
to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Certifications
-- Organic certificates, phytosanitary documents, export licences. The file
-- itself lives in a private storage bucket and is never publicly readable.
-- ---------------------------------------------------------------------------

create table public.certifications (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  name            text not null,
  issuing_body    text,
  reference       text,
  document_path   text,
  issued_on       date,
  expires_on      date,
  status          app.certification_status not null default 'pending',
  reviewed_by     uuid references public.profiles(id),
  reviewed_at     timestamptz,
  review_notes    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index certifications_company_idx on public.certifications (company_id);
create index certifications_expiry_idx on public.certifications (expires_on) where status = 'verified';

create trigger certifications_touch
  before update on public.certifications
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Enable RLS. Policies are defined in migration 0005.
-- Until then these tables are readable by nobody except the service role,
-- which is the correct default.
-- ---------------------------------------------------------------------------

alter table public.countries        enable row level security;
alter table public.currencies       enable row level security;
alter table public.units            enable row level security;
alter table public.profiles         enable row level security;
alter table public.companies        enable row level security;
alter table public.company_members  enable row level security;
alter table public.certifications   enable row level security;
