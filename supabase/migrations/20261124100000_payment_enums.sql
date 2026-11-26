-- ===========================================================================
-- AfriLynq / Stage 4 / 02  The new states money moves through
--
-- Run this one FIRST, on its own, and let it finish before running 04.
--
-- Postgres will not let a transaction add a value to an enum and then use
-- that value. Everything that uses these lives in 04, which is why this is
-- a separate file rather than a section of one.
--
-- Collins's seven order statuses against what Stage 2 already built:
--
--   1 Awaiting payment                  awaiting_payment   NEW
--   2 Payment confirmed                 confirmed          exists
--   3 Processing order                  in_production      exists
--   4 Dispatched                        shipped            exists
--   5 Delivered, awaiting confirmation  delivered          exists
--   6 Payout approved                   payout_approved    NEW
--   7 Supplier paid                     completed          exists
--
-- Five of the seven already exist under different names, which is why this
-- adds two values rather than replacing an enum that orders already depend
-- on. in_transit, cancelled and disputed stay as they are.
--
-- Safe to run twice.
-- ===========================================================================

alter type app.order_status add value if not exists 'awaiting_payment' before 'confirmed';
alter type app.order_status add value if not exists 'payout_approved'  before 'completed';

-- ---------------------------------------------------------------------------
-- What a payment attempt can be
--
-- Separate from the order's status on purpose. An order is a commercial
-- state and a payment is a money state, and they fail independently: a
-- buyer can abandon checkout twice and pay on the third attempt, and the
-- order should not wobble through three statuses because of it.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_status'
                   and typnamespace = 'app'::regnamespace) then
    create type app.payment_status as enum (
      'pending',              -- checkout opened, nothing confirmed
      'successful',           -- verified with the provider, server side
      'failed',               -- the provider says it did not go through
      'cancelled',            -- the buyer walked away
      'refunded',
      'partially_refunded'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- What a payout to a supplier can be
--
-- 'manual' is not a failure. It is the honest state for a supplier in a
-- country the provider cannot reach, where somebody at AfriLynq makes the
-- transfer by hand. Without it those payments live in an inbox.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'payout_status'
                   and typnamespace = 'app'::regnamespace) then
    create type app.payout_status as enum (
      'pending',              -- owed, delivery not confirmed yet
      'approved',             -- cleared for release
      'processing',           -- sent to the provider, not yet confirmed
      'paid',
      'failed',
      'manual'                -- to be settled outside the platform
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'refund_status'
                   and typnamespace = 'app'::regnamespace) then
    create type app.refund_status as enum ('pending', 'completed', 'failed');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Check it
-- ---------------------------------------------------------------------------

-- Read from the catalogue, not from the type.
--
-- The obvious check here was enum_range(null::app.order_status), and it is
-- what the first version did. It fails: casting to the type counts as
-- using the values just added, and Postgres refuses that until the
-- transaction commits. The Supabase editor runs a whole script as one
-- transaction, so the check took the migration down with it.
--
-- pg_enum holds the labels as plain text, so reading them touches the new
-- values without using them.

select
  (select count(*) from pg_enum e
     join pg_type t on t.oid = e.enumtypid
    where t.typname = 'order_status'
      and t.typnamespace = 'app'::regnamespace
      and e.enumlabel in ('awaiting_payment', 'payout_approved')) as new_order_states,
  (select count(*) from pg_type where typname = 'payment_status'
     and typnamespace = 'app'::regnamespace) as payment_status_exists,
  (select count(*) from pg_type where typname = 'payout_status'
     and typnamespace = 'app'::regnamespace) as payout_status_exists,
  (select count(*) from pg_type where typname = 'refund_status'
     and typnamespace = 'app'::regnamespace) as refund_status_exists;
