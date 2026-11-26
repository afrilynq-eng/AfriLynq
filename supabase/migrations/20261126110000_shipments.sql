-- ===========================================================================
-- AfriLynq / Logistics 01  Shipments
--
-- Until now the whole of logistics has been two free text columns on
-- orders: carrier_name and tracking_reference, typed by the supplier when
-- they mark an order dispatched. That is enough to tell a buyer who has
-- the goods. It is not enough to run a marketplace that moves food across
-- a border.
--
-- WHY A SEPARATE TABLE RATHER THAN MORE COLUMNS ON ORDERS
--
-- An order is a commercial agreement. A shipment is a physical movement.
-- They are usually one to one and sometimes not: a part shipment, a
-- reshipment after a rejection at the border, a consolidated load. Two
-- columns on orders cannot express any of that, and the day one is needed
-- the alternative is a schema change under pressure.
--
-- MULTIPLE CARRIERS, NOT ONE PARTNER
--
-- The decision of 15 November was that AfriLynq works with several
-- logistics companies rather than Sprint Africa alone. So carriers are a
-- table, not a constant, and the status model is the platform's own
-- rather than any one carrier's. DHL's "IN TRANSIT" and a Lagos freight
-- forwarder's phone call both arrive here as the same six states.
--
-- MOST CARRIERS WILL HAVE NO API
--
-- Built for that from the start. Every event can be entered by hand by an
-- administrator, and a carrier with an API pushes the same events through
-- the same door. The manual path is the normal path, not the fallback.
--
-- Run this AFTER the Stage 4 migrations.
-- Safe to run twice.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- Note on an older column
--
-- orders.delivery_confirmed_at has existed since September and no code has
-- ever read or written it. stage4-06 added buyer_confirmed_at for the same
-- purpose before anyone noticed. The one in use is buyer_confirmed_at.
-- This is left in place rather than dropped, because dropping a column is
-- not something to do in the same breath as adding a feature.
-- ---------------------------------------------------------------------------

comment on column public.orders.delivery_confirmed_at is
  'SUPERSEDED by buyer_confirmed_at. Never written. Safe to drop once confirmed unused.';

-- ---------------------------------------------------------------------------
-- Who moves the goods
-- ---------------------------------------------------------------------------

create table if not exists public.carriers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,

  -- How status reaches us. Most will be 'manual' for a long time.
  integration   text not null default 'manual',
  -- Set when integration is 'push'. Compared in constant time, never shown.
  push_secret   text,

  -- Where they actually go. Empty means ask them.
  origin_countries      char(2)[] not null default '{}',
  destination_countries char(2)[] not null default '{}',

  contact_name  text,
  contact_email text,
  contact_phone text,
  website       text,
  notes         text,

  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint carriers_integration check (integration in ('manual', 'push', 'api')),
  constraint carriers_named check (length(trim(name)) > 0),
  -- A carrier that pushes needs something to authenticate with.
  constraint carriers_push_has_secret
    check (integration <> 'push' or (push_secret is not null and length(push_secret) >= 32))
);

create index if not exists carriers_active_idx on public.carriers (active) where active;

drop trigger if exists carriers_touch on public.carriers;
create trigger carriers_touch before update on public.carriers
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- The movement itself
-- ---------------------------------------------------------------------------

create sequence if not exists app.shipment_ref_seq;

create table if not exists public.shipments (
  id          uuid primary key default gen_random_uuid(),
  reference   text not null unique,

  order_id    uuid not null references public.orders(id) on delete restrict,
  carrier_id  uuid references public.carriers(id) on delete restrict,

  -- The carrier's own reference. Not unique: carriers reuse and recycle,
  -- and two carriers can issue the same string.
  tracking_reference text,
  service            text,

  status      text not null default 'booked',

  -- What is actually moving. Needed for a commercial invoice and for a
  -- freight quote, and asked for by every carrier on earth.
  pieces           integer,
  gross_weight_kg  numeric(10, 3),
  volume_m3        numeric(10, 4),
  declared_value_minor bigint,
  declared_currency    char(3) references public.currencies(code),

  -- Where it goes. Copied from the order at booking rather than joined,
  -- because an address edited afterwards must not rewrite history about
  -- where something was actually sent.
  origin_country_code      char(2),
  destination_country_code char(2),
  origin_address           text,
  destination_address      text,

  incoterm text,

  booked_at           timestamptz not null default now(),
  collected_at        timestamptz,
  delivered_at        timestamptz,
  expected_delivery   date,

  notes      text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint shipments_status check (status in (
    'booked', 'collected', 'in_transit', 'customs',
    'out_for_delivery', 'delivered', 'exception', 'cancelled'
  )),
  constraint shipments_weight_sane
    check (gross_weight_kg is null or gross_weight_kg > 0),
  constraint shipments_pieces_sane
    check (pieces is null or pieces > 0),
  constraint shipments_value_sane
    check (declared_value_minor is null or
           (declared_value_minor >= 0 and declared_currency is not null))
);

create index if not exists shipments_order_idx   on public.shipments (order_id);
create index if not exists shipments_carrier_idx on public.shipments (carrier_id);
create index if not exists shipments_status_idx  on public.shipments (status);
create index if not exists shipments_tracking_idx
  on public.shipments (tracking_reference) where tracking_reference is not null;

create or replace function app.set_shipment_reference()
returns trigger language plpgsql as $$
begin
  if new.reference is null then
    new.reference := 'SHP-' || to_char(now(), 'YY') || '-' ||
                     lpad(nextval('app.shipment_ref_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists shipments_reference on public.shipments;
create trigger shipments_reference before insert on public.shipments
  for each row execute function app.set_shipment_reference();

drop trigger if exists shipments_touch on public.shipments;
create trigger shipments_touch before update on public.shipments
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Everything that happened to it
--
-- Append only. The shipment's status column is the latest event, kept on
-- the row so a list screen does not need a lateral join; this table is the
-- history, and the history is what answers "where was it on Tuesday".
-- ---------------------------------------------------------------------------

create table if not exists public.shipment_events (
  id          uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,

  status      text not null,
  description text,
  location    text,

  -- When it happened, which is not when we were told. A carrier pushing a
  -- batch at midnight is reporting things that happened during the day.
  occurred_at timestamptz not null default now(),

  -- Who said so. 'carrier' came through the push endpoint, 'admin' and
  -- 'supplier' were typed by a person, 'system' was inferred.
  source      text not null default 'admin',
  recorded_by uuid references public.profiles(id),
  raw         jsonb,

  created_at  timestamptz not null default now(),

  constraint shipment_events_status check (status in (
    'booked', 'collected', 'in_transit', 'customs',
    'out_for_delivery', 'delivered', 'exception', 'cancelled'
  )),
  constraint shipment_events_source check (source in ('carrier', 'admin', 'supplier', 'system'))
);

create index if not exists shipment_events_shipment_idx
  on public.shipment_events (shipment_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- The paperwork
--
-- The part that is underestimated until a container sits at Felixstowe.
-- Agricultural goods entering the UK need a phytosanitary certificate and
-- a certificate of origin on top of the commercial documents, and a
-- shipment missing one does not move.
--
-- The file itself goes to storage; this records that it exists, what it
-- is, and whether anybody has checked it.
-- ---------------------------------------------------------------------------

create table if not exists public.shipment_documents (
  id          uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,

  kind        text not null,
  storage_path text,
  issued_at   date,
  expires_at  date,
  reference   text,

  uploaded_by uuid references public.profiles(id),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  notes       text,

  created_at  timestamptz not null default now(),

  constraint shipment_documents_kind check (kind in (
    'commercial_invoice',
    'packing_list',
    'certificate_of_origin',
    'phytosanitary_certificate',
    'bill_of_lading',
    'air_waybill',
    'export_declaration',
    'import_declaration',
    'insurance_certificate',
    'other'
  )),
  constraint shipment_documents_verified_has_author
    check (num_nonnulls(verified_at, verified_by) <> 1)
);

create index if not exists shipment_documents_shipment_idx
  on public.shipment_documents (shipment_id);

-- ---------------------------------------------------------------------------
-- Who may see what
--
-- A shipment belongs to the two parties on its order and to AfriLynq.
-- Carriers do not read from here at all; they push events through an
-- endpoint that authenticates them separately, which keeps a carrier from
-- ever seeing another carrier's work or a buyer's commercial terms.
-- ---------------------------------------------------------------------------

alter table public.carriers            enable row level security;
alter table public.shipments           enable row level security;
alter table public.shipment_events     enable row level security;
alter table public.shipment_documents  enable row level security;

-- A party to an order can see who is carrying their goods, and nothing
-- else about the carrier: no secret, and the view below is what they read.
drop policy if exists carriers_read on public.carriers;
create policy carriers_read on public.carriers
  for select to authenticated
  using (app.is_platform_admin());

create or replace function app.party_to_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app
as $$
  select exists (
    select 1 from public.orders o
     where o.id = p_order_id
       and (
         app.is_the_buyer(o.buyer_company_id, o.buyer_profile_id)
         or o.supplier_company_id in (select app.company_ids_for(auth.uid()))
       )
  );
$$;

drop policy if exists shipments_read on public.shipments;
create policy shipments_read on public.shipments
  for select to authenticated
  using (app.is_platform_admin() or app.party_to_order(order_id));

drop policy if exists shipment_events_read on public.shipment_events;
create policy shipment_events_read on public.shipment_events
  for select to authenticated
  using (
    app.is_platform_admin()
    or exists (
      select 1 from public.shipments s
       where s.id = shipment_events.shipment_id
         and app.party_to_order(s.order_id)
    )
  );

/**
 * Documents are deliberately NOT readable by the parties yet.
 *
 * A commercial invoice carries the supplier's pricing and a certificate of
 * origin carries their grower's details. Which of those a buyer should see
 * is a commercial decision Collins has not made, and the safe default
 * while it is unmade is that only AfriLynq sees them. Opening it later is
 * one policy; retrieving a leaked invoice is not possible.
 */
drop policy if exists shipment_documents_read on public.shipment_documents;
create policy shipment_documents_read on public.shipment_documents
  for select to authenticated
  using (app.is_platform_admin());

-- Everything is written through functions or by the platform. Nobody gets
-- a direct insert or update: a supplier who could write a shipment event
-- could mark their own goods delivered, which is the gate that releases
-- their money.
revoke all on public.carriers, public.shipments,
              public.shipment_events, public.shipment_documents
  from anon, authenticated;

grant select on public.shipments, public.shipment_events to authenticated;
grant select on public.carriers, public.shipment_documents to authenticated;

-- ---------------------------------------------------------------------------
-- What a party to the order may see of the carrier
--
-- The name and the website, so a buyer can go and track it themselves.
-- Never the push secret, never the contact details, which are AfriLynq's
-- commercial relationship and not the buyer's.
-- ---------------------------------------------------------------------------

create or replace view public.carriers_public as
  select id, name, slug, website, active
    from public.carriers
   where active;

revoke all on public.carriers_public from anon;
grant select on public.carriers_public to authenticated;

-- ---------------------------------------------------------------------------
-- Check it
--
-- anon must read nothing. A signed in user must not reach the carriers
-- table itself, only the view.
-- ---------------------------------------------------------------------------

select
  (select count(*) from information_schema.tables
    where table_schema = 'public'
      and table_name in ('carriers', 'shipments', 'shipment_events', 'shipment_documents')
  ) as tables_created,
  has_table_privilege('anon', 'public.shipments', 'select')         as anon_reads_shipments,
  has_table_privilege('anon', 'public.carriers_public', 'select')   as anon_reads_carriers,
  has_table_privilege('authenticated', 'public.shipments', 'select') as user_reads_shipments,
  has_table_privilege('authenticated', 'public.carriers_public', 'select') as user_reads_view,
  (select count(*) from pg_policies
    where schemaname = 'public'
      and tablename in ('carriers', 'shipments', 'shipment_events', 'shipment_documents')
  ) as policies;

commit;
