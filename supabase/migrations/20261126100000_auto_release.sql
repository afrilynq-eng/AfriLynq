-- ===========================================================================
-- AfriLynq / Stage 4 / 09  Releasing a payout the buyer never confirmed
--
-- A supplier is paid when the buyer confirms the goods arrived. That rule
-- protects the buyer and, left alone, strands the supplier: a buyer who
-- simply never presses the button leaves their supplier unpaid for ever,
-- with no way out except raising a dispute against a customer they would
-- rather keep.
--
-- This is the other half of that rule. Seven days after a delivery is
-- marked, with no confirmation and no dispute, the payout is released.
-- Recommended in the payment model document in November and not built
-- until now; until it is deployed the gap above is live.
--
-- WHY THIS IS NOT A LIE ABOUT THE BUYER
--
-- It would be easier to set buyer_confirmed_at and let everything
-- downstream work unchanged. It would also be false: the buyer confirmed
-- nothing. The release gets its own column, so an order that was released
-- on a timer can always be told apart from one a buyer actually signed
-- off, which matters the day somebody asks why a supplier was paid.
--
-- WHAT IT WILL NOT TOUCH
--   an order with an open dispute
--   an order with any refund that is not failed
--   a payout that is not still pending
--   an order already released, however it was released
--
-- Run this AFTER 02 through 08.
-- Safe to run twice, and safe to run as often as you like.
-- ===========================================================================

begin;

alter table public.orders
  add column if not exists auto_released_at timestamptz;

comment on column public.orders.auto_released_at is
  'Released on a timer because the buyer never confirmed. Never means the buyer confirmed.';

-- How long a buyer gets. Here rather than in the application so that the
-- rule and the thing that enforces it cannot disagree.
create or replace function app.confirmation_window_days()
returns integer language sql immutable as $$
  select 7;
$$;

create index if not exists orders_awaiting_release_idx
  on public.orders (delivered_at)
  where buyer_confirmed_at is null
    and auto_released_at is null
    and dispute_resolved_at is null;

-- ---------------------------------------------------------------------------
-- The job
--
-- Returns a row per order released so the caller can tell both sides. A
-- release nobody is told about is indistinguishable from a bug.
-- ---------------------------------------------------------------------------

create or replace function public.release_unconfirmed_deliveries(
  p_days integer default null
)
returns table (
  order_id            uuid,
  order_reference     text,
  supplier_company_id uuid,
  buyer_company_id    uuid,
  buyer_profile_id    uuid,
  payout_reference    text,
  net_minor           bigint,
  currency            char(3)
)
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_days integer := coalesce(p_days, app.confirmation_window_days());
  v_cutoff timestamptz := now() - make_interval(days => v_days);
begin
  return query
  with due as (
    select o.id
      from public.orders o
     where o.delivered_at is not null
       and o.delivered_at <= v_cutoff
       and o.buyer_confirmed_at is null
       and o.auto_released_at is null
       and o.dispute_resolved_at is null
       and o.status::text not in ('disputed', 'cancelled', 'completed', 'awaiting_payment')
       -- Nothing with an argument running against it.
       and not exists (
         select 1 from public.disputes d
          where d.order_id = o.id and d.status = 'open'
       )
       -- Nothing where money has already gone back to the buyer.
       and not exists (
         select 1 from public.refunds r
          where r.order_id = o.id and r.status <> 'failed'
       )
       -- Only where the supplier is genuinely still waiting.
       and exists (
         select 1 from public.payouts p
          where p.order_id = o.id and p.status = 'pending'
       )
  ),
  released as (
    update public.orders o
       set auto_released_at = now(),
           status = 'payout_approved'::app.order_status
      from due
     where o.id = due.id
    returning o.id, o.reference, o.supplier_company_id,
              o.buyer_company_id, o.buyer_profile_id
  ),
  approved as (
    update public.payouts p
       set status = 'approved',
           approved_at = now(),
           failed_reason = null
      from released
     where p.order_id = released.id
       and p.status = 'pending'
    returning p.order_id, p.reference, p.net_minor, p.currency
  )
  select r.id, r.reference, r.supplier_company_id,
         r.buyer_company_id, r.buyer_profile_id,
         a.reference, a.net_minor, a.currency
    from released r
    join approved a on a.order_id = r.id;
end;
$$;

-- approved_by is deliberately left null on these: nobody approved them.
-- A null there, against a row whose order carries auto_released_at, is
-- the record that this was the timer and not a person.

/**
 * Who may run it.
 *
 * The grant is the whole control, and there is deliberately no
 * is_platform_admin() check inside. That check reads auth.uid(), which is
 * null for the service key the scheduled job runs under, so it would have
 * refused the only caller this function has and the job would have done
 * nothing every night without ever failing visibly.
 *
 * So: nobody holding a browser session can execute it, and the service
 * role can. The scheduled route that calls it is itself behind a secret.
 */
revoke all on function public.release_unconfirmed_deliveries(integer) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.release_unconfirmed_deliveries(integer) to service_role';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- What is waiting, and what is due
--
-- A read-only view for the administration screen, so the countdown is
-- visible before the release happens rather than only afterwards.
-- ---------------------------------------------------------------------------

create or replace view public.orders_awaiting_confirmation as
  select
    o.id as order_id,
    o.reference,
    o.supplier_company_id,
    o.delivered_at,
    o.delivered_at + make_interval(days => app.confirmation_window_days()) as releases_at,
    greatest(
      0,
      ceil(extract(epoch from (
        o.delivered_at + make_interval(days => app.confirmation_window_days()) - now()
      )) / 86400)
    )::int as days_left
  from public.orders o
 where o.delivered_at is not null
   and o.buyer_confirmed_at is null
   and o.auto_released_at is null
   and o.dispute_resolved_at is null
   and o.status::text not in ('disputed', 'cancelled', 'completed', 'awaiting_payment');

revoke all on public.orders_awaiting_confirmation from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Check it
--
-- nobody_can_run must be false for anon and for authenticated: this runs
-- as the platform, from a scheduled job, and never from a browser.
-- ---------------------------------------------------------------------------

select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'orders'
      and column_name = 'auto_released_at') as column_added,
  app.confirmation_window_days() as window_days,
  has_function_privilege('anon', 'public.release_unconfirmed_deliveries(integer)', 'execute')
    as anon_can_run,
  has_function_privilege('authenticated', 'public.release_unconfirmed_deliveries(integer)', 'execute')
    as user_can_run,
  has_function_privilege('service_role', 'public.release_unconfirmed_deliveries(integer)', 'execute')
    as platform_can_run,
  (select count(*) from public.orders_awaiting_confirmation) as awaiting_now;

commit;
