-- ===========================================================================
-- AfriLynq / Stage 4 / 06  Delivery, and the buyer confirming it
--
-- The rule Collins set is that a supplier is not paid until the buyer has
-- confirmed the goods arrived. Everything built so far can take a payment,
-- raise a payout and let an administrator approve it. Nothing can record
-- that a delivery happened, so the approval gate has nothing to read and
-- every Approve button stays disabled for ever.
--
-- This adds the four facts that gate is missing:
--
--   shipped_at           the supplier dispatched it
--   delivered_at         the supplier says it arrived
--   buyer_confirmed_at   the BUYER says it arrived
--   buyer_confirmed_by   which person pressed it
--
-- The last two are the ones that matter. A supplier marking their own
-- delivery complete is a claim, not a confirmation, and releasing money on
-- it would make the whole escrow promise decorative. So the payout gate
-- reads buyer_confirmed_at and nothing else.
--
-- Run this AFTER 02, 03, 04 and 05.
-- Safe to run twice.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- The four timestamps
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists shipped_at         timestamptz,
  add column if not exists delivered_at       timestamptz,
  add column if not exists buyer_confirmed_at timestamptz,
  add column if not exists buyer_confirmed_by uuid references public.profiles(id);

comment on column public.orders.delivered_at is
  'When the SUPPLIER marked it delivered. A claim, not a confirmation.';
comment on column public.orders.buyer_confirmed_at is
  'When the BUYER confirmed receipt. This, and only this, releases a payout.';

-- A buyer cannot confirm a delivery that was never marked delivered. The
-- reverse is normal: a supplier marks delivered and waits.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'orders_confirmation_follows_delivery'
       and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_confirmation_follows_delivery
      check (buyer_confirmed_at is null or delivered_at is not null);
  end if;
end $$;

-- Who confirmed it is recorded whenever a confirmation is.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'orders_confirmation_has_an_author'
       and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_confirmation_has_an_author
      check (num_nonnulls(buyer_confirmed_at, buyer_confirmed_by) <> 1);
  end if;
end $$;

create index if not exists orders_awaiting_confirmation_idx
  on public.orders (delivered_at)
  where buyer_confirmed_at is null;

-- ---------------------------------------------------------------------------
-- Who may move an order along
--
-- Until now orders were written only by the service key, because nothing
-- on the platform changed one after it was raised. Two parties now need to,
-- and each may change exactly the columns that are theirs to change:
--
--   the supplier   marks it in production, shipped, delivered, and fills
--                  in the carrier and tracking reference
--   the buyer      confirms receipt, and nothing else
--
-- Both are done through functions rather than a table policy on orders.
-- An update policy broad enough to let a supplier set status would also
-- let them set it to completed, and a buyer who could update their own
-- order could set total_minor. The functions below change the specific
-- columns and re-check who is asking, which a row policy cannot do.
-- ---------------------------------------------------------------------------

create or replace function public.supplier_advance_order(
  p_order_id  uuid,
  p_status    text,
  p_carrier   text default null,
  p_tracking  text default null
)
returns void
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_order   public.orders%rowtype;
  v_allowed text[];
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'No such order' using errcode = '42704';
  end if;

  -- The caller must be the supplier on this order.
  if v_order.supplier_company_id not in (select app.company_ids_for(auth.uid())) then
    raise exception 'You are not the supplier on this order' using errcode = '42501';
  end if;

  -- Nothing moves until the money is in. A supplier shipping against an
  -- unpaid order is the exact exposure the platform exists to remove.
  if v_order.status::text = 'awaiting_payment' then
    raise exception 'This order has not been paid for yet' using errcode = '42501';
  end if;

  -- Forward only, one step at a time, and never past delivered: what
  -- happens after that is the buyer's to say and the platform's to pay.
  /**
   * Compared as text, never as the enum.
   *
   * v_order.status is app.order_status, so writing `case v_order.status
   * when 'in_transit' then` makes Postgres coerce that literal to the enum
   * to do the comparison. If the label does not exist the whole statement
   * throws, in every branch, whichever status the order is actually in.
   * Tested: it took out all four supplier steps at once, including the
   * ones that never mention in_transit. Casting to text keeps the
   * comparison in text and lets the filter below decide what is real.
   */
  v_allowed := case v_order.status::text
    when 'confirmed'     then array['in_production', 'shipped']
    when 'in_production' then array['shipped']
    when 'shipped'       then array['in_transit', 'delivered']
    when 'in_transit'    then array['delivered']
    else array[]::text[]
  end;

  /**
   * Keep only the values the enum actually holds.
   *
   * in_transit is in the interface's status map but was never confirmed to
   * be in app.order_status, and a cast to a label that does not exist
   * fails at the moment a supplier presses the button rather than here.
   * Filtering against pg_enum means a missing value is simply never
   * offered, and the day somebody adds it the step starts working with no
   * further change.
   */
  select array_agg(a) into v_allowed
    from unnest(v_allowed) as a
   where exists (
     select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
     where t.typname = 'order_status'
       and t.typnamespace = 'app'::regnamespace
       and e.enumlabel = a
   );

  if v_allowed is null or not (p_status = any (v_allowed)) then
    raise exception 'An order that is % cannot become %', v_order.status, p_status
      using errcode = '22023';
  end if;

  update public.orders
     set status       = p_status::app.order_status,
         shipped_at   = case when p_status = 'shipped' and shipped_at is null
                             then now() else shipped_at end,
         delivered_at = case when p_status = 'delivered' and delivered_at is null
                             then now() else delivered_at end,
         carrier_name = coalesce(nullif(trim(p_carrier), ''), carrier_name),
         tracking_reference = coalesce(nullif(trim(p_tracking), ''), tracking_reference)
   where id = p_order_id;
end;
$$;

create or replace function public.buyer_confirm_delivery(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'No such order' using errcode = '42704';
  end if;

  -- app.is_the_buyer covers both shapes a buyer comes in: a company, or a
  -- shopper with no company at all. stage4-04 taught orders about the
  -- second, and leaving it out here would mean a shopper could never
  -- confirm a delivery and their supplier could never be paid.
  if not app.is_the_buyer(v_order.buyer_company_id, v_order.buyer_profile_id) then
    raise exception 'You are not the buyer on this order' using errcode = '42501';
  end if;

  if v_order.delivered_at is null then
    raise exception 'This order has not been marked delivered yet' using errcode = '42501';
  end if;

  -- Confirming twice is not an error, it is a double click.
  if v_order.buyer_confirmed_at is not null then
    return;
  end if;

  update public.orders
     set buyer_confirmed_at = now(),
         buyer_confirmed_by = auth.uid(),
         -- The status only moves if it is still behind. An order already
         -- further along is not dragged backwards by a late confirmation.
         --
         -- Compared as text for the same reason as above: an enum label in
         -- this list that does not exist throws for every order, not just
         -- the ones in that state.
         status = case when status::text in ('shipped', 'in_transit', 'delivered')
                       then 'delivered'::app.order_status
                       else status end,
         delivered_at = coalesce(delivered_at, now())
   where id = p_order_id;
end;
$$;

revoke all on function public.supplier_advance_order(uuid, text, text, text) from public, anon;
revoke all on function public.buyer_confirm_delivery(uuid) from public, anon;
grant execute on function public.supplier_advance_order(uuid, text, text, text) to authenticated;
grant execute on function public.buyer_confirm_delivery(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The new columns are readable by the parties to the order
--
-- stage3 revoked table-wide select on orders and grants column by column,
-- so a column added now is invisible until it is named. Same pattern, and
-- the same reason: a column added later should be private by default.
-- ---------------------------------------------------------------------------

do $$
begin
  if has_table_privilege('authenticated', 'public.orders', 'select') then
    -- A table-wide grant is already in force, so the new columns are
    -- covered by it and there is nothing to add.
    null;
  else
    execute 'grant select (shipped_at, delivered_at, buyer_confirmed_at, buyer_confirmed_by) '
            'on public.orders to authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Check it
--
-- columns_added should be 4, both functions should exist, and anon should
-- not be able to execute either of them.
-- ---------------------------------------------------------------------------

select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'orders'
      and column_name in ('shipped_at', 'delivered_at', 'buyer_confirmed_at', 'buyer_confirmed_by'))
    as columns_added,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('supplier_advance_order', 'buyer_confirm_delivery')) as functions_created,
  has_function_privilege('anon', 'public.buyer_confirm_delivery(uuid)', 'execute') as anon_may_confirm,
  has_function_privilege('authenticated', 'public.buyer_confirm_delivery(uuid)', 'execute') as user_may_confirm,
  -- Read as text, never cast to the enum: a cast to a label added in this
  -- same transaction is what Postgres refused on 24 November.
  (select string_agg(e.enumlabel, ', ' order by e.enumsortorder)
     from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'order_status'
      and t.typnamespace = 'app'::regnamespace) as order_statuses;

commit;
