-- ===========================================================================
-- AfriLynq / Stage 4 / 07  Where a supplier's money actually goes
--
-- Everything built so far can take a buyer's money, hold it, and decide
-- that a supplier is owed. Not one line of it knows the supplier's bank
-- account. The payouts screen can say "approved" all day and there is
-- nowhere to send anything.
--
-- The old /account/payouts page was Stripe onboarding, and since 03
-- renamed stripe_account_id to payout_account_id it has been selecting
-- columns that no longer exist: silently returning nothing and telling
-- every supplier their setup had not started. It is replaced by a page
-- built on this table.
--
-- Two ways to be paid, because Africa is not one payments market:
--
--   bank          an account number at a named bank
--   mobile_money  a phone number on a named network
--
-- Both are stored as the supplier gives them. bank_code stays empty until
-- there are Flutterwave credentials to resolve a bank name into their own
-- code; a payout settled by hand, which is every Zambian and Togolese one
-- for now, needs only the human readable details anyway.
--
-- Run this AFTER 02 through 06.
-- Safe to run twice.
-- ===========================================================================

begin;

create table if not exists public.payout_accounts (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,

  method        text not null default 'bank',
  country_code  text not null,
  currency      char(3) not null references public.currencies(code),

  -- Bank
  bank_name      text,
  bank_code      text,
  account_number text,

  -- Mobile money
  phone    text,
  network  text,

  -- Whose name is on it. Required either way, because a transfer to a name
  -- that does not match the account is the commonest way one bounces.
  account_name text not null,

  is_default  boolean not null default true,
  verified_at timestamptz,
  notes       text,

  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payout_accounts_method
    check (method in ('bank', 'mobile_money')),

  -- Each method needs its own fields and must not carry the other's.
  constraint payout_accounts_has_its_details
    check (
      (method = 'bank'
        and bank_name is not null and length(trim(bank_name)) > 0
        and account_number is not null and length(trim(account_number)) > 0)
      or
      (method = 'mobile_money'
        and phone is not null and length(trim(phone)) > 0
        and network is not null and length(trim(network)) > 0)
    ),

  constraint payout_accounts_name_given
    check (length(trim(account_name)) > 0)
);

comment on table public.payout_accounts is
  'Where a supplier is paid. Written by the supplier, read by them and by platform admins.';
comment on column public.payout_accounts.bank_code is
  'The payment provider''s own code for the bank. Empty until it can be resolved.';

create index if not exists payout_accounts_company_idx
  on public.payout_accounts (company_id);

-- One default per company per currency. A supplier may hold a naira
-- account and a sterling one; they may not hold two naira defaults, or
-- nothing downstream can decide which to pay.
create unique index if not exists payout_accounts_one_default_idx
  on public.payout_accounts (company_id, currency)
  where is_default;

-- Keep updated_at honest.
create or replace function public.touch_payout_account()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists payout_accounts_touch on public.payout_accounts;
create trigger payout_accounts_touch
  before update on public.payout_accounts
  for each row execute function public.touch_payout_account();

-- ---------------------------------------------------------------------------
-- Which payout went where
--
-- Recorded on the payout itself, so a question about a transfer sent eight
-- months ago is answered by the row rather than by whatever the supplier's
-- details happen to say today. Details change; history should not.
-- ---------------------------------------------------------------------------

alter table public.payouts
  add column if not exists payout_account_id uuid references public.payout_accounts(id),
  add column if not exists destination_snapshot jsonb;

comment on column public.payouts.destination_snapshot is
  'The destination as it stood when this payout was sent. Never updated afterwards.';

-- ---------------------------------------------------------------------------
-- Who may see and change these
--
-- An account number is the most sensitive thing on the platform after a
-- password. Rows are visible to the company that owns them and to platform
-- administrators, who need the full number to make a transfer by hand, and
-- to nobody else. Only the owning company may write.
-- ---------------------------------------------------------------------------

alter table public.payout_accounts enable row level security;

drop policy if exists payout_accounts_read on public.payout_accounts;
create policy payout_accounts_read on public.payout_accounts
  for select to authenticated
  using (
    company_id in (select app.company_ids_for(auth.uid()))
    or app.is_platform_admin()
  );

drop policy if exists payout_accounts_insert on public.payout_accounts;
create policy payout_accounts_insert on public.payout_accounts
  for insert to authenticated
  with check (company_id in (select app.company_ids_for(auth.uid())));

drop policy if exists payout_accounts_update on public.payout_accounts;
create policy payout_accounts_update on public.payout_accounts
  for update to authenticated
  using (company_id in (select app.company_ids_for(auth.uid())))
  with check (company_id in (select app.company_ids_for(auth.uid())));

drop policy if exists payout_accounts_delete on public.payout_accounts;
create policy payout_accounts_delete on public.payout_accounts
  for delete to authenticated
  using (company_id in (select app.company_ids_for(auth.uid())));

-- An administrator reads through these policies, not around them, so an
-- administrator who stops being one stops seeing account numbers.
revoke all on public.payout_accounts from anon;
grant select, insert, update, delete on public.payout_accounts to authenticated;

-- ---------------------------------------------------------------------------
-- Check it
--
-- anon_can_read must be false. The two counts confirm the table and its
-- new payout columns exist.
-- ---------------------------------------------------------------------------

select
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'payout_accounts') as table_created,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'payouts'
      and column_name in ('payout_account_id', 'destination_snapshot')) as payout_columns,
  has_table_privilege('anon', 'public.payout_accounts', 'select') as anon_can_read,
  has_table_privilege('authenticated', 'public.payout_accounts', 'select') as user_can_read,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'payout_accounts') as policies;

commit;
