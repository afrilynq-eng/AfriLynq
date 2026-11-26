-- ===========================================================================
-- AfriLynq / Stage 4 / 01  Where a supplier's Stripe account is recorded
--
-- A connected account is created once per supplier and never changes. Its
-- id has to live beside the company, because every payout, transfer and
-- status check starts from it.
--
-- Privacy
-- -------
-- stage3-03 revoked table-wide select on companies and granted the public
-- columns one by one. A column added after that inherits no grant, so
-- these two are unreadable by anon and by authenticated from the moment
-- they exist, without another revoke. That is what we want: a connected
-- account id is not public, and it is not something one company should
-- learn about another. The application reads it with the service key,
-- behind a membership check.
--
-- Safe to run twice.
-- ===========================================================================

begin;

alter table public.companies
  add column if not exists stripe_account_id text,
  add column if not exists payouts_enabled boolean not null default false,
  add column if not exists stripe_requirements_due text[];

-- One Stripe account per company, and one company per Stripe account.
create unique index if not exists companies_stripe_account_idx
  on public.companies (stripe_account_id)
  where stripe_account_id is not null;

comment on column public.companies.stripe_account_id is
  'The Stripe connected account for this supplier. Created once, never changed.';
comment on column public.companies.payouts_enabled is
  'Set from the account.updated webhook. True once Stripe will actually pay this supplier.';
comment on column public.companies.stripe_requirements_due is
  'What Stripe is still waiting for, so a supplier can be told rather than left guessing.';

-- ---------------------------------------------------------------------------
-- Check it
--
-- The two new columns should be readable by neither anon nor a signed in
-- user. Only the service key and definer functions see them.
-- ---------------------------------------------------------------------------

select
  has_column_privilege('anon',          'public.companies', 'stripe_account_id', 'select') as anon_reads_account,
  has_column_privilege('authenticated', 'public.companies', 'stripe_account_id', 'select') as user_reads_account,
  has_column_privilege('authenticated', 'public.companies', 'payouts_enabled',   'select') as user_reads_enabled,
  -- and the public pages still work
  has_column_privilege('anon',          'public.companies', 'legal_name',        'select') as anon_reads_name;

commit;
