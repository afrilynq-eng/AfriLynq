-- ===========================================================================
-- AfriLynq / Stage 4 / 03  Payments, payouts and refunds
--
-- Run 02 first and let it finish. This file uses the enum values that one
-- adds, and Postgres will refuse them in the same transaction.
--
-- Three ledgers, deliberately separate:
--
--   payments   money coming in from a buyer
--   payouts    money going out to a supplier
--   refunds    money going back to a buyer
--
-- They are not one table with a direction column. Each has its own
-- lifecycle, its own provider identifiers and its own failure modes, and a
-- single table would be half empty in every row.
--
-- Currency rules, which Collins set out and which the shape below enforces:
--
--   The order's currency is recorded and never silently changed.
--   The 7 percent is calculated in that same currency.
--   A payout carries BOTH the amount owed in the order's currency AND the
--     amount actually sent, with the rate and the fee between them written
--     down. A supplier can therefore always see why the number differs.
--
-- Provider-neutral throughout. Stage 4 began on Stripe, which cannot pay
-- African suppliers, and is now on Flutterwave. The next change should not
-- need another migration, so no column here is named after a company.
--
-- Safe to run twice.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- The Stripe columns, renamed
--
-- stage4-01 added stripe_account_id and friends. Nothing was ever stored in
-- them, because no connected account was successfully created before the
-- provider changed. Renaming now costs nothing and avoids a companies table
-- that talks about Stripe while the platform runs on Flutterwave.
--
-- They inherit no column grant, exactly as before: stage3-03 revoked
-- table-wide select on companies, so a column added after it is invisible to
-- anon and to signed in users until it is granted, and these never are.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'companies'
                 and column_name = 'stripe_account_id') then
    alter table public.companies rename column stripe_account_id to payout_account_id;
  end if;

  if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'companies'
                 and column_name = 'stripe_requirements_due') then
    alter table public.companies rename column stripe_requirements_due to payout_requirements_due;
  end if;
end $$;

alter table public.companies
  add column if not exists payout_provider text,
  add column if not exists payout_bank_name text,
  add column if not exists payout_account_name text,
  add column if not exists payout_account_last4 text,
  add column if not exists payout_currency char(3);

comment on column public.companies.payout_account_id is
  'The supplier''s identifier at whichever payout provider is in use. Never public.';
comment on column public.companies.payout_account_last4 is
  'Last four digits only. The full account number is held by the provider, not by us.';

-- ---------------------------------------------------------------------------
-- An order now begins before the money arrives
--
-- Stage 2 created orders at 'confirmed', because nothing on the platform
-- took payment and an order only existed once both sides had agreed.
--
-- Collins's first status is "Awaiting payment: buyer has submitted an order
-- but has not completed payment", so the order is now created when a
-- quotation is accepted and waits for the money. That also gives an
-- abandoned checkout somewhere to live, which matters: a buyer who gets
-- halfway and closes the tab should leave a record a supplier can chase,
-- not nothing at all.
--
-- Safe here because 02 committed the value before this file runs.
-- ---------------------------------------------------------------------------

alter table public.orders alter column status set default 'awaiting_payment';

-- ---------------------------------------------------------------------------
-- References
-- ---------------------------------------------------------------------------

create sequence if not exists app.payment_ref_seq start 1000;
create sequence if not exists app.payout_ref_seq  start 1000;
create sequence if not exists app.refund_ref_seq  start 1000;

-- ---------------------------------------------------------------------------
-- Payments: money coming in
-- ---------------------------------------------------------------------------

create table if not exists public.payments (
  id                      uuid primary key default gen_random_uuid(),
  reference               text not null unique,

  -- A payment is created when checkout opens, which is before the order
  -- exists. It is tied to the quotation first and the order once there is
  -- one, so an abandoned checkout leaves no orphan order behind.
  quotation_id            uuid not null references public.quotations(id) on delete restrict,
  order_id                uuid references public.orders(id) on delete restrict,

  -- Either a company is paying or a shopper is, the same rule stage3-06
  -- applied to enquiries and quotations.
  buyer_company_id        uuid references public.companies(id) on delete restrict,
  buyer_profile_id        uuid references public.profiles(id) on delete restrict,

  supplier_company_id     uuid not null references public.companies(id) on delete restrict,

  status                  app.payment_status not null default 'pending',

  -- The currency the buyer agreed to, carried from the quotation. Nothing
  -- in this system converts it.
  currency                char(3) not null references public.currencies(code),
  amount_minor            bigint not null,

  -- What actually landed after the provider took its cut. Known only after
  -- verification, and not always then.
  settled_minor           bigint,
  provider_fee_minor      bigint,

  provider                text not null default 'flutterwave',
  provider_tx_id          text,
  payment_method          text,

  -- Set only by a server-side verification call, never by a redirect from
  -- the browser. A buyer returning to a success URL proves nothing.
  verified_at             timestamptz,
  failed_reason           text,

  -- The verification response as the provider sent it. The evidence if a
  -- payment is ever argued about.
  provider_payload        jsonb,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint payments_amount_positive check (amount_minor > 0),
  constraint payments_one_buyer check (num_nonnulls(buyer_company_id, buyer_profile_id) = 1)
);

-- Duplicate payment protection, which Collins asked for by name. The
-- provider's transaction id can appear once. A webhook delivered three
-- times, which Stripe and Flutterwave both do, cannot become three payments.
create unique index if not exists payments_provider_tx_idx
  on public.payments (provider, provider_tx_id)
  where provider_tx_id is not null;

create index if not exists payments_quotation_idx on public.payments (quotation_id);
create index if not exists payments_order_idx on public.payments (order_id);
create index if not exists payments_supplier_idx on public.payments (supplier_company_id, created_at desc);
create index if not exists payments_status_idx on public.payments (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Payouts: money going out
-- ---------------------------------------------------------------------------

create table if not exists public.payouts (
  id                      uuid primary key default gen_random_uuid(),
  reference               text not null unique,

  order_id                uuid not null references public.orders(id) on delete restrict,
  supplier_company_id     uuid not null references public.companies(id) on delete restrict,

  status                  app.payout_status not null default 'pending',

  -- The arithmetic, all in the order's own currency. gross is what the
  -- buyer paid, net is what the supplier is owed, and the two commission
  -- columns show the working rather than leaving it to be inferred.
  currency                char(3) not null references public.currencies(code),
  gross_minor             bigint not null,
  commission_rate         numeric(5,2) not null,
  commission_minor        bigint not null,
  net_minor               bigint not null,

  -- Set when a dispute reduced the sale. The commission is then charged on
  -- what the supplier actually receives, at the lower disputed rate, which
  -- is the rule Michael settled in November.
  disputed                boolean not null default false,

  -- What the supplier actually receives, which may be in another currency.
  -- Filled in when the transfer is prepared, not before: an exchange rate
  -- written down early is a rate that will be wrong by the time it is used.
  payout_currency         char(3) references public.currencies(code),
  payout_amount_minor     bigint,
  exchange_rate           numeric(18,8),
  transfer_fee_minor      bigint,

  provider                text,
  provider_transfer_id    text,

  -- True where no provider can reach this supplier's country, so somebody
  -- settles it by hand. Zambia and Togo are live on the platform today.
  manual                  boolean not null default false,

  approved_at             timestamptz,
  approved_by             uuid references public.profiles(id),
  sent_at                 timestamptz,
  paid_at                 timestamptz,
  failed_reason           text,
  notes                   text,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint payouts_amounts check (
    gross_minor >= 0 and commission_minor >= 0 and net_minor >= 0
    and commission_minor + net_minor <= gross_minor
  ),
  -- A rate without the currency it converted to, or the reverse, is a
  -- number nobody can check.
  constraint payouts_conversion_complete check (
    num_nonnulls(payout_currency, payout_amount_minor, exchange_rate) in (0, 3)
  )
);

create unique index if not exists payouts_order_idx on public.payouts (order_id);
create index if not exists payouts_supplier_idx on public.payouts (supplier_company_id, created_at desc);
create index if not exists payouts_status_idx on public.payouts (status, created_at desc);
create unique index if not exists payouts_provider_transfer_idx
  on public.payouts (provider, provider_transfer_id)
  where provider_transfer_id is not null;

-- ---------------------------------------------------------------------------
-- Refunds: money going back
-- ---------------------------------------------------------------------------

create table if not exists public.refunds (
  id                      uuid primary key default gen_random_uuid(),
  reference               text not null unique,

  payment_id              uuid not null references public.payments(id) on delete restrict,
  order_id                uuid references public.orders(id) on delete restrict,

  status                  app.refund_status not null default 'pending',
  currency                char(3) not null references public.currencies(code),
  amount_minor            bigint not null,

  -- Why, in words, because a refund is always explained to somebody later.
  reason                  text not null,

  provider                text,
  provider_refund_id      text,

  created_by              uuid not null references public.profiles(id),
  created_at              timestamptz not null default now(),
  completed_at            timestamptz,
  failed_reason           text,

  constraint refunds_amount_positive check (amount_minor > 0)
);

create index if not exists refunds_payment_idx on public.refunds (payment_id);
create index if not exists refunds_order_idx on public.refunds (order_id);

-- ---------------------------------------------------------------------------
-- References, set by the database so two servers cannot mint the same one
-- ---------------------------------------------------------------------------

create or replace function app.set_payment_reference()
returns trigger language plpgsql as $$
begin
  if new.reference is null then
    new.reference := 'PAY-' || to_char(now(), 'YY') || '-' ||
                     lpad(nextval('app.payment_ref_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create or replace function app.set_payout_reference()
returns trigger language plpgsql as $$
begin
  if new.reference is null then
    new.reference := 'PYT-' || to_char(now(), 'YY') || '-' ||
                     lpad(nextval('app.payout_ref_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create or replace function app.set_refund_reference()
returns trigger language plpgsql as $$
begin
  if new.reference is null then
    new.reference := 'REF-' || to_char(now(), 'YY') || '-' ||
                     lpad(nextval('app.refund_ref_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists payments_reference on public.payments;
create trigger payments_reference before insert on public.payments
  for each row execute function app.set_payment_reference();

drop trigger if exists payouts_reference on public.payouts;
create trigger payouts_reference before insert on public.payouts
  for each row execute function app.set_payout_reference();

drop trigger if exists refunds_reference on public.refunds;
create trigger refunds_reference before insert on public.refunds
  for each row execute function app.set_refund_reference();

drop trigger if exists payments_touch on public.payments;
create trigger payments_touch before update on public.payments
  for each row execute function app.touch_updated_at();

drop trigger if exists payouts_touch on public.payouts;
create trigger payouts_touch before update on public.payouts
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Who may see what
--
-- Reads only. Nothing here is writable by a signed in user, because every
-- row is money: payments are written by the webhook and payouts by an
-- administrator, both with the service key. A buyer who could update a
-- payment row could mark their own order paid.
-- ---------------------------------------------------------------------------

alter table public.payments enable row level security;
alter table public.payouts  enable row level security;
alter table public.refunds  enable row level security;

drop policy if exists payments_party_read on public.payments;
create policy payments_party_read on public.payments
  for select to authenticated
  using (
    app.is_the_buyer(buyer_company_id, buyer_profile_id)
    or supplier_company_id in (select app.company_ids_for(auth.uid()))
    or app.is_platform_admin()
  );

drop policy if exists payouts_party_read on public.payouts;
create policy payouts_party_read on public.payouts
  for select to authenticated
  using (
    supplier_company_id in (select app.company_ids_for(auth.uid()))
    or app.is_platform_admin()
  );

drop policy if exists refunds_party_read on public.refunds;
create policy refunds_party_read on public.refunds
  for select to authenticated
  using (
    exists (
      select 1 from public.payments p
       where p.id = refunds.payment_id
         and (app.is_the_buyer(p.buyer_company_id, p.buyer_profile_id)
              or p.supplier_company_id in (select app.company_ids_for(auth.uid()))
              or app.is_platform_admin())
    )
  );

grant select on public.payouts, public.refunds to authenticated;

-- ---------------------------------------------------------------------------
-- payments, granted column by column
--
-- The provider's raw response is ours, not the buyer's. It carries the
-- provider's own identifiers and whatever else it chose to include, and
-- nobody on the platform has a reason to read it.
--
-- It cannot simply be revoked. A table-wide grant of select covers every
-- column and a later revoke of one column does not subtract from it: the
-- first version of this file tried exactly that and the column stayed
-- readable. The same trap as stage3-03, which is where this pattern comes
-- from. So the grant is built from the live column list minus the ones we
-- are keeping, which means a column added later is private until somebody
-- decides otherwise.
-- ---------------------------------------------------------------------------

do $$
declare
  private_cols constant text[] := array['provider_payload'];
  public_cols  text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into public_cols
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'payments'
     and column_name <> all (private_cols);

  execute 'revoke select on public.payments from anon, authenticated';
  execute format('grant select (%s) on public.payments to authenticated', public_cols);
end $$;

-- Nothing about money is public.
revoke all on public.payments, public.payouts, public.refunds from anon;

-- ---------------------------------------------------------------------------
-- Check it
-- ---------------------------------------------------------------------------

select
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name in ('payments', 'payouts', 'refunds')) as tables_created,
  has_column_privilege('authenticated', 'public.payments', 'amount_minor', 'select') as user_reads_amount,
  has_column_privilege('authenticated', 'public.payments', 'provider_payload', 'select') as user_reads_payload,
  has_table_privilege('anon', 'public.payouts', 'select') as anon_reads_payouts,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'companies'
      and column_name = 'payout_account_id') as companies_renamed;

commit;
