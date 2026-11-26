-- ===========================================================================
-- AfriLynq / Stage 4 / 04  A shopper can have an order
--
-- The same bug as stage3-06, in the one table that stage3-06 did not reach.
--
-- Stage 2 built orders with buyer_company_id NOT NULL, because at the time
-- every buyer was a company. stage3-06 then made shoppers first class:
-- enquiries, quotations and messages all learned to carry either a company
-- or a person. Orders were left alone because nothing created one yet.
--
-- So a shopper can today send an enquiry, be quoted, accept the quotation,
-- and then the order insert fails on a not-null violation. Exactly the
-- error that stopped quotations working on 15 November, waiting one table
-- further down the line.
--
-- Found while writing the checkout, before any shopper met it.
--
-- Safe to run twice.
-- ===========================================================================

begin;

alter table public.orders
  add column if not exists buyer_profile_id uuid references public.profiles(id) on delete restrict;

alter table public.orders
  alter column buyer_company_id drop not null;

-- One buyer or the other, never both and never neither. Same rule and same
-- wording as quotations, so the two tables cannot drift apart.
alter table public.orders drop constraint if exists orders_one_buyer;
alter table public.orders
  add constraint orders_one_buyer
  check (num_nonnulls(buyer_company_id, buyer_profile_id) = 1);

create index if not exists orders_buyer_profile_idx
  on public.orders (buyer_profile_id, created_at desc)
  where buyer_profile_id is not null;

-- ---------------------------------------------------------------------------
-- The row policies have to learn about the shopper too
--
-- Without this an order would exist that its own buyer could not see, which
-- is the failure mode from 15 November: the data was right and the policy
-- hid it, so the screen showed nothing and nobody could tell why.
--
-- app.is_the_buyer already handles both shapes. It was written in stage3-06
-- for precisely this and is reused rather than repeated.
-- ---------------------------------------------------------------------------

drop policy if exists orders_party_read on public.orders;
create policy orders_party_read on public.orders
  for select to authenticated
  using (
    app.is_the_buyer(buyer_company_id, buyer_profile_id)
    or supplier_company_id in (select app.company_ids_for(auth.uid()))
    or app.is_platform_admin()
  );

drop policy if exists orders_party_update on public.orders;
create policy orders_party_update on public.orders
  for update to authenticated
  using (
    app.is_the_buyer(buyer_company_id, buyer_profile_id)
    or supplier_company_id in (select app.company_ids_for(auth.uid()))
    or app.is_platform_admin()
  )
  with check (
    app.is_the_buyer(buyer_company_id, buyer_profile_id)
    or supplier_company_id in (select app.company_ids_for(auth.uid()))
    or app.is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- Check it
--
-- The third column is the one that matters: a shopper's order, inserted and
-- then read back under that shopper's own session.
-- ---------------------------------------------------------------------------

do $$
declare
  ok boolean;
begin
  -- Would a shopper order survive the constraint?
  begin
    perform 1 where num_nonnulls(null::uuid, gen_random_uuid()) = 1;
    ok := true;
  exception when others then
    ok := false;
  end;
  if not ok then
    raise exception 'The one-buyer rule rejects a shopper order.';
  end if;
end $$;

select
  (select is_nullable from information_schema.columns
    where table_schema = 'public' and table_name = 'orders'
      and column_name = 'buyer_company_id') as company_now_optional,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'orders'
      and column_name = 'buyer_profile_id') as profile_column_added,
  (select count(*) from pg_constraint
    where conname = 'orders_one_buyer') as one_buyer_rule,
  (select count(*) from pg_policies
    where tablename = 'orders' and policyname = 'orders_party_read') as read_policy;

commit;
