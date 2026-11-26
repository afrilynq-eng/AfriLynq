-- ===========================================================================
-- AfriLynq / Stage 4 / 08  Disputes
--
-- Everything built so far assumes the deal goes well: buyer pays, supplier
-- ships, buyer confirms, supplier is paid. A platform that only handles
-- that case is not holding anybody's money safely, it is just slow.
--
-- A dispute is the other path. Either side may raise one, because the two
-- failures are different and both are real: a buyer who received the wrong
-- goods, and a supplier whose buyer has gone quiet and will not confirm a
-- delivery that plainly happened.
--
-- THE CHARGE IN A DISPUTE
--
-- Decided by Michael on 25 November 2026, in Richard's absence after four
-- unanswered asks: AfriLynq charges only on money that actually reaches
-- the supplier, and at half the usual rate. 3.5 percent rather than 7.
--
--   £1,000 sale, £400 returned to the buyer, £600 released
--   charge = 3.5% of 600 = £21, supplier receives £579
--   a clean sale would have earned £70, so the dispute costs AfriLynq £49
--
-- The rate lives in app.dispute_charge_percent() and in lib/fees.ts, and
-- those two must agree.
--
-- THE GATE
--
-- A payout is released by the buyer confirming delivery. A disputed order
-- never gets that confirmation, so without this migration a resolved
-- dispute would leave the supplier's money stranded for ever. Orders
-- therefore gain dispute_resolved_at, and the payout gate accepts either.
--
-- Run this AFTER 02 through 07.
-- Safe to run twice.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- The rate, in the database as well as the application
-- ---------------------------------------------------------------------------

create or replace function app.dispute_charge_percent()
returns numeric language sql immutable as $$
  select 3.5::numeric;
$$;

comment on function app.dispute_charge_percent() is
  'Half the standard service charge. Must match SERVICE_CHARGE_DISPUTE_PERCENT in lib/fees.ts.';

-- ---------------------------------------------------------------------------
-- Orders learn that a dispute happened
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists disputed_at          timestamptz,
  add column if not exists dispute_resolved_at  timestamptz;

comment on column public.orders.dispute_resolved_at is
  'Set when a dispute is settled. Releases the payout gate in place of a buyer confirmation.';

-- ---------------------------------------------------------------------------
-- The disputes themselves
-- ---------------------------------------------------------------------------

create sequence if not exists app.dispute_ref_seq;

create table if not exists public.disputes (
  id          uuid primary key default gen_random_uuid(),
  reference   text not null unique,

  order_id    uuid not null references public.orders(id) on delete restrict,
  payment_id  uuid references public.payments(id) on delete restrict,

  raised_by   uuid not null references public.profiles(id),
  raised_side text not null,
  reason      text not null,

  status      text not null default 'open',

  -- Filled in on resolution
  refund_minor     bigint,
  release_minor    bigint,
  commission_minor bigint,
  currency         char(3) references public.currencies(code),
  resolution_note  text,
  resolved_by      uuid references public.profiles(id),
  resolved_at      timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint disputes_side  check (raised_side in ('buyer', 'supplier')),
  constraint disputes_state check (status in ('open', 'resolved', 'withdrawn')),
  constraint disputes_reason_given check (length(trim(reason)) > 0),

  -- A resolved dispute carries its numbers; an open one carries none of
  -- them. Half a resolution is how a row ends up meaning nothing.
  constraint disputes_resolution_complete check (
    (status = 'resolved'
      and refund_minor is not null and release_minor is not null
      and commission_minor is not null and currency is not null
      and resolved_at is not null and resolved_by is not null)
    or
    (status <> 'resolved'
      and refund_minor is null and release_minor is null
      and commission_minor is null)
  ),

  constraint disputes_amounts_sane check (
    refund_minor is null or (refund_minor >= 0 and release_minor >= 0
      and commission_minor >= 0 and commission_minor <= release_minor)
  )
);

create index if not exists disputes_order_idx  on public.disputes (order_id);
create index if not exists disputes_status_idx on public.disputes (status);

-- One open dispute per order. A second would mean two people arguing about
-- the same money with no way to say which resolution wins.
create unique index if not exists disputes_one_open_idx
  on public.disputes (order_id) where status = 'open';

create or replace function app.set_dispute_reference()
returns trigger language plpgsql as $$
begin
  if new.reference is null then
    new.reference := 'DIS-' || to_char(now(), 'YY') || '-' ||
                     lpad(nextval('app.dispute_ref_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists disputes_reference on public.disputes;
create trigger disputes_reference before insert on public.disputes
  for each row execute function app.set_dispute_reference();

drop trigger if exists disputes_touch on public.disputes;
create trigger disputes_touch before update on public.disputes
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Raising one
--
-- Either party to the order, never anybody else, and only once the money
-- is actually in. There is nothing to dispute about an unpaid order; that
-- is a conversation, and the platform already has messaging for it.
-- ---------------------------------------------------------------------------

create or replace function public.raise_dispute(p_order_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_order   public.orders%rowtype;
  v_side    text;
  v_payment uuid;
  v_id      uuid;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'No such order' using errcode = '42704';
  end if;

  if app.is_the_buyer(v_order.buyer_company_id, v_order.buyer_profile_id) then
    v_side := 'buyer';
  elsif v_order.supplier_company_id in (select app.company_ids_for(auth.uid())) then
    v_side := 'supplier';
  else
    raise exception 'You are not a party to this order' using errcode = '42501';
  end if;

  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'A dispute needs a reason' using errcode = '22023';
  end if;

  if v_order.status::text = 'awaiting_payment' then
    raise exception 'Nothing has been paid on this order yet' using errcode = '42501';
  end if;

  if v_order.status::text in ('completed', 'cancelled') then
    raise exception 'This order is already closed' using errcode = '42501';
  end if;

  select id into v_payment
    from public.payments
   where order_id = p_order_id and status = 'successful'
   order by created_at desc limit 1;

  insert into public.disputes (order_id, payment_id, raised_by, raised_side, reason)
  values (p_order_id, v_payment, auth.uid(), v_side, trim(p_reason))
  returning id into v_id;

  update public.orders
     set status = 'disputed'::app.order_status,
         disputed_at = coalesce(disputed_at, now())
   where id = p_order_id;

  -- Money stops moving the moment a dispute exists. A payout already sent
  -- is left alone, because it cannot be recalled from here and pretending
  -- otherwise would make the row lie.
  update public.payouts
     set status = 'pending'
   where order_id = p_order_id
     and status in ('approved');

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Settling one
--
-- Administrators only. The refund amount is the single decision; every
-- other number follows from it, which is deliberate. An administrator who
-- could type both the refund and the release could make them disagree.
-- ---------------------------------------------------------------------------

create or replace function public.resolve_dispute(
  p_dispute_id   uuid,
  p_refund_minor bigint,
  p_note         text default null
)
returns void
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_dispute    public.disputes%rowtype;
  v_order      public.orders%rowtype;
  v_payment    public.payments%rowtype;
  v_total      bigint;
  v_release    bigint;
  v_commission bigint;
  v_currency   char(3);
begin
  if not app.is_platform_admin() then
    raise exception 'Only an administrator can settle a dispute' using errcode = '42501';
  end if;

  select * into v_dispute from public.disputes where id = p_dispute_id;
  if not found then
    raise exception 'No such dispute' using errcode = '42704';
  end if;
  if v_dispute.status <> 'open' then
    raise exception 'That dispute is already %', v_dispute.status using errcode = '22023';
  end if;

  select * into v_order from public.orders where id = v_dispute.order_id;

  -- What was actually taken, which is not always the order total: a part
  -- refund may already have gone back for some other reason.
  if v_dispute.payment_id is not null then
    select * into v_payment from public.payments where id = v_dispute.payment_id;
    v_total := v_payment.amount_minor;
    v_currency := v_payment.currency;
  else
    v_total := v_order.total_minor;
    v_currency := v_order.currency;
  end if;

  v_total := v_total - coalesce((
    select sum(amount_minor) from public.refunds
     where payment_id = v_dispute.payment_id and status <> 'failed'
  ), 0);

  if p_refund_minor is null or p_refund_minor < 0 then
    raise exception 'The refund cannot be negative' using errcode = '22023';
  end if;
  if p_refund_minor > v_total then
    raise exception 'Only % is left to refund on this payment', v_total using errcode = '22023';
  end if;

  v_release := v_total - p_refund_minor;
  v_commission := round(v_release * app.dispute_charge_percent() / 100);

  -- Record the settlement.
  update public.disputes
     set status = 'resolved',
         refund_minor = p_refund_minor,
         release_minor = v_release,
         commission_minor = v_commission,
         currency = v_currency,
         resolution_note = nullif(trim(coalesce(p_note, '')), ''),
         resolved_by = auth.uid(),
         resolved_at = now()
   where id = p_dispute_id;

  -- The buyer's money back, if any. Raised as pending: deciding it and
  -- sending it are two different acts.
  if p_refund_minor > 0 and v_dispute.payment_id is not null then
    insert into public.refunds (payment_id, order_id, status, currency,
                                amount_minor, reason, created_by)
    values (v_dispute.payment_id, v_dispute.order_id, 'pending', v_currency,
            p_refund_minor,
            'Dispute ' || v_dispute.reference || ' settled',
            auth.uid());
  end if;

  -- The supplier's share, at the reduced rate.
  update public.payouts
     set disputed = true,
         commission_minor = v_commission,
         net_minor = v_release - v_commission,
         commission_rate = app.dispute_charge_percent(),
         status = case when v_release > 0 then 'approved' else 'failed' end,
         approved_at = case when v_release > 0 then now() else approved_at end,
         approved_by = case when v_release > 0 then auth.uid() else approved_by end,
         failed_reason = case when v_release > 0 then null
                              else 'Order refunded in full after dispute '
                                   || v_dispute.reference end
   where order_id = v_dispute.order_id
     and status not in ('paid', 'processing');

  -- The gate. A disputed order never receives a buyer confirmation, so
  -- without this the supplier's money would sit unreleasable for ever.
  update public.orders
     set dispute_resolved_at = now(),
         status = case when v_release > 0
                       then 'payout_approved'::app.order_status
                       else 'cancelled'::app.order_status end
   where id = v_dispute.order_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Who may see and do what
-- ---------------------------------------------------------------------------

alter table public.disputes enable row level security;

drop policy if exists disputes_read on public.disputes;
create policy disputes_read on public.disputes
  for select to authenticated
  using (
    app.is_platform_admin()
    or exists (
      select 1 from public.orders o
       where o.id = disputes.order_id
         and (
           app.is_the_buyer(o.buyer_company_id, o.buyer_profile_id)
           or o.supplier_company_id in (select app.company_ids_for(auth.uid()))
         )
    )
  );

-- Raising and settling both happen through the functions above, which
-- check who is asking and keep the amounts consistent. Nothing writes to
-- this table directly.
revoke all on public.disputes from anon, authenticated;
grant select on public.disputes to authenticated;

revoke all on function public.raise_dispute(uuid, text) from public, anon;
revoke all on function public.resolve_dispute(uuid, bigint, text) from public, anon;
grant execute on function public.raise_dispute(uuid, text) to authenticated;
grant execute on function public.resolve_dispute(uuid, bigint, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Check it
-- ---------------------------------------------------------------------------

select
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'disputes') as table_created,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'orders'
      and column_name in ('disputed_at', 'dispute_resolved_at')) as order_columns,
  app.dispute_charge_percent() as dispute_rate,
  has_table_privilege('anon', 'public.disputes', 'select') as anon_can_read,
  has_function_privilege('anon', 'public.resolve_dispute(uuid, bigint, text)', 'execute')
    as anon_can_resolve,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'disputes') as policies;

commit;
