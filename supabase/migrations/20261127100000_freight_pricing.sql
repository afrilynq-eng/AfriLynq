-- Freight pricing.
--
-- The meeting settled four things: AfriLynq picks the carrier, the pick is
-- automatic, the supplier delivers to the carrier rather than being collected
-- from, and the system works the freight cost out itself. This is the schema
-- that makes the last one possible, and it is not as simple as weight.
--
-- Freight is not charged on what a thing weighs. It is charged on the greater
-- of actual weight and volumetric weight, where volumetric is the space it
-- occupies divided by a constant the carrier chooses (6000 is the IATA
-- standard, some use 5000). Dried agricultural goods are light and bulky, so
-- on most of what this platform sells the volumetric figure wins. Quoting on
-- actual weight alone would undercharge every hibiscus and shea order on the
-- site, and the gap is not small.
--
-- Sea works the same way with different units: the chargeable unit is a
-- revenue tonne, the greater of the cubic metres and the tonnes.
--
-- So three things have to be stored that are not stored today:
--   1. How a product packs, so volume can be worked out at all
--   2. What a carrier charges, per lane, in weight bands, with an expiry
--   3. What was quoted, frozen, so a rate change next week cannot rewrite
--      an order placed today
--
-- Nothing here changes an existing column's meaning. It is all additive.

-- ---------------------------------------------------------------------------
-- 1. How a product packs
-- ---------------------------------------------------------------------------
-- A supplier cannot tell you the volume of an order. They can tell you what
-- one sack looks like and how much goes in it, which is the same information
-- in a form they actually hold.

alter table public.products
  add column if not exists pack_label            text,
  add column if not exists units_per_pack        numeric(14, 3),
  add column if not exists pack_gross_weight_kg  numeric(10, 3),
  add column if not exists pack_length_cm        numeric(8, 1),
  add column if not exists pack_width_cm         numeric(8, 1),
  add column if not exists pack_height_cm        numeric(8, 1);

comment on column public.products.pack_label is
  'What one pack is, in the supplier''s words: "50 kg jute sack", "20 kg carton".';
comment on column public.products.units_per_pack is
  'How many of the product''s own sale units fit in one pack. A product sold by '
  'the kg in a 50 kg sack has 50 here.';
comment on column public.products.pack_gross_weight_kg is
  'Weight of one full pack including the packaging itself, which is what a '
  'carrier weighs.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_pack_positive'
  ) then
    alter table public.products add constraint products_pack_positive check (
      coalesce(units_per_pack, 1) > 0
      and coalesce(pack_gross_weight_kg, 1) > 0
      and coalesce(pack_length_cm, 1) > 0
      and coalesce(pack_width_cm, 1) > 0
      and coalesce(pack_height_cm, 1) > 0
    );
  end if;
end $$;

-- A product is only quotable for freight when it can be both weighed and
-- measured. Surfacing this as a column keeps the supplier form honest and
-- gives the admin side something to filter an incomplete catalogue by.
create or replace view public.products_freight_ready
  with (security_invoker = true) as
  select
    p.id,
    p.company_id,
    p.name,
    (p.units_per_pack is not null
      and p.pack_gross_weight_kg is not null
      and p.pack_length_cm is not null
      and p.pack_width_cm is not null
      and p.pack_height_cm is not null) as freight_ready
  from public.products p;

-- ---------------------------------------------------------------------------
-- 2. What a carrier is, commercially
-- ---------------------------------------------------------------------------

alter table public.carriers
  add column if not exists volumetric_divisor integer not null default 6000,
  add column if not exists commission_rate    numeric(5, 2) not null default 10.00,
  add column if not exists depot_address      text,
  add column if not exists depot_country_code char(2) references public.countries(code);

comment on column public.carriers.volumetric_divisor is
  'Divides length x width x height in cm to give volumetric kg. 6000 is the '
  'IATA standard; some carriers use 5000, which bills a bulky load higher. '
  'Ask, do not assume.';
comment on column public.carriers.commission_rate is
  'Percent of the freight charge the carrier remits to AfriLynq. Agreed once '
  'at registration. It is taken out of the carrier''s invoice, not added to '
  'the buyer''s bill.';
comment on column public.carriers.depot_address is
  'Where the supplier delivers the goods. There is no collection leg: the '
  'supplier brings it here.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'carriers_divisor_sane'
  ) then
    alter table public.carriers add constraint carriers_divisor_sane
      check (volumetric_divisor between 1000 and 10000);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'carriers_commission_sane'
  ) then
    alter table public.carriers add constraint carriers_commission_sane
      check (commission_rate >= 0 and commission_rate <= 100);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Lanes
-- ---------------------------------------------------------------------------
-- A carrier does not have one price. They have a price per route per mode,
-- and they are good at some routes and absent from others.

create table if not exists public.carrier_lanes (
  id          uuid primary key default gen_random_uuid(),
  carrier_id  uuid not null references public.carriers(id) on delete cascade,

  origin_country_code      char(2) not null references public.countries(code),
  destination_country_code char(2) not null references public.countries(code),

  -- Narrows a lane to one airport or port when a carrier only serves one.
  origin_hub      text,
  destination_hub text,

  mode text not null,

  transit_days_min smallint,
  transit_days_max smallint,

  -- Most of what moves here is food, so this decides what can be sold on
  -- the lane at all rather than being a nice extra.
  chilled boolean not null default false,

  -- Overrides the carrier's depot when a lane runs from a different one.
  depot_address text,

  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint carrier_lanes_mode check (mode in ('air', 'sea', 'road')),
  constraint carrier_lanes_transit_order check (
    transit_days_min is null or transit_days_max is null
    or transit_days_max >= transit_days_min
  ),
  unique (carrier_id, origin_country_code, destination_country_code,
          mode, chilled)
);

create index if not exists carrier_lanes_lookup
  on public.carrier_lanes (origin_country_code, destination_country_code, active)
  where active;

-- ---------------------------------------------------------------------------
-- 4. Rate cards
-- ---------------------------------------------------------------------------
-- The stable half of the price. A card has an expiry because a carrier's
-- rate is only good for a window, and a card without one silently becomes a
-- lie about three months from now.

create table if not exists public.carrier_rate_cards (
  id       uuid primary key default gen_random_uuid(),
  lane_id  uuid not null references public.carrier_lanes(id) on delete cascade,

  currency char(3) not null references public.currencies(code),

  -- Below the first break, freight is the minimum charge and nothing else.
  minimum_charge_minor bigint not null default 0,

  valid_from date not null default current_date,
  valid_to   date not null,

  source_note text,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),

  constraint rate_cards_window check (valid_to > valid_from),
  constraint rate_cards_minimum_non_negative check (minimum_charge_minor >= 0)
);

create index if not exists carrier_rate_cards_current
  on public.carrier_rate_cards (lane_id, valid_from, valid_to);

-- The weight bands. Air cargo has sold this way for decades: the more you
-- send, the less each kilo costs, in steps rather than a curve.
create table if not exists public.carrier_rate_breaks (
  id            uuid primary key default gen_random_uuid(),
  rate_card_id  uuid not null references public.carrier_rate_cards(id) on delete cascade,

  -- The weight at which this rate starts applying. 0, 45, 100, 300, 500,
  -- 1000 are the conventional points, but a carrier may use their own.
  break_from_kg numeric(10, 2) not null,

  -- Fractional minor units, because a rate of 3.825 per kg is ordinary and
  -- rounding it to the penny before multiplying by 400 kg loses real money.
  price_per_kg_minor numeric(14, 4) not null,

  constraint rate_breaks_from_non_negative check (break_from_kg >= 0),
  constraint rate_breaks_price_non_negative check (price_per_kg_minor >= 0),
  unique (rate_card_id, break_from_kg)
);

-- ---------------------------------------------------------------------------
-- 5. Surcharges
-- ---------------------------------------------------------------------------
-- The volatile half. This is the honest answer to "freight costs are not
-- stable": the instability lives almost entirely here, and here is one row
-- to edit rather than a whole rate card to renegotiate.

create table if not exists public.carrier_surcharges (
  id         uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references public.carriers(id) on delete cascade,
  -- Null means it applies to every lane the carrier runs.
  lane_id    uuid references public.carrier_lanes(id) on delete cascade,

  kind  text not null,
  basis text not null,

  -- Read against basis: a percent of base freight, an amount per chargeable
  -- kilo in minor units, or a flat amount in minor units.
  value numeric(14, 4) not null,

  effective_from date not null default current_date,
  effective_to   date,

  created_at timestamptz not null default now(),

  constraint surcharges_kind check (kind in ('fuel', 'security', 'handling', 'other')),
  constraint surcharges_basis check (basis in ('percent', 'per_kg', 'flat')),
  constraint surcharges_value_non_negative check (value >= 0),
  constraint surcharges_window check (effective_to is null or effective_to > effective_from)
);

create index if not exists carrier_surcharges_current
  on public.carrier_surcharges (carrier_id, effective_from, effective_to);

-- ---------------------------------------------------------------------------
-- 6. The quote, frozen
-- ---------------------------------------------------------------------------
-- A quote is a historical fact, not a calculation to repeat. Every figure
-- that went into it is stored, including the rate card it came from, so that
-- in six months a disputed invoice can be settled by reading a row instead
-- of trying to reconstruct what the price was that day.

create table if not exists public.freight_quotes (
  id       uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,

  carrier_id   uuid not null references public.carriers(id) on delete restrict,
  lane_id      uuid not null references public.carrier_lanes(id) on delete restrict,
  rate_card_id uuid not null references public.carrier_rate_cards(id) on delete restrict,

  -- What was measured.
  packs                 integer,
  actual_weight_kg      numeric(10, 3) not null,
  volume_m3             numeric(10, 4) not null,
  volumetric_weight_kg  numeric(10, 3) not null,
  chargeable_weight_kg  numeric(10, 3) not null,
  volumetric_divisor    integer not null,

  -- What was charged.
  currency             char(3) not null references public.currencies(code),
  applied_break_kg     numeric(10, 2),
  applied_rate_per_kg  numeric(14, 4),
  base_minor           bigint not null,
  surcharge_minor      bigint not null default 0,
  total_minor          bigint not null,
  minimum_applied      boolean not null default false,

  -- What AfriLynq earns, recorded rather than added. The buyer pays
  -- total_minor either way.
  commission_rate  numeric(5, 2) not null,
  commission_minor bigint not null,

  -- Readable breakdown of each surcharge that was applied, so the buyer can
  -- be shown why the number is what it is.
  surcharge_detail jsonb not null default '[]'::jsonb,

  -- Several carriers are quoted, one is chosen. Keeping the losers makes the
  -- automatic choice auditable instead of mysterious.
  selected   boolean not null default false,

  locked_at  timestamptz not null default now(),
  expires_at timestamptz,

  created_at timestamptz not null default now(),

  constraint freight_quotes_weights_positive check (
    actual_weight_kg > 0 and chargeable_weight_kg > 0
  ),
  constraint freight_quotes_money_non_negative check (
    base_minor >= 0 and surcharge_minor >= 0 and total_minor >= 0
    and commission_minor >= 0
  )
);

create index if not exists freight_quotes_order on public.freight_quotes (order_id);
create unique index if not exists freight_quotes_one_selected
  on public.freight_quotes (order_id) where selected;

-- ---------------------------------------------------------------------------
-- 7. What it actually cost
-- ---------------------------------------------------------------------------
-- The quote is what was promised. This is what the carrier billed. The gap
-- between them is the number that decides whether the pricing model is
-- working, and nobody can see it unless it is written down.

alter table public.shipments
  add column if not exists freight_quote_id uuid
    references public.freight_quotes(id) on delete set null,
  add column if not exists carrier_invoice_minor bigint,
  add column if not exists carrier_invoice_currency char(3)
    references public.currencies(code),
  add column if not exists carrier_invoiced_at timestamptz;

comment on column public.shipments.carrier_invoice_minor is
  'What the carrier actually billed. Compared against the quote to show '
  'whether the declared packing was honest and the rate card is current.';

-- Runs as the reader, not as the owner. Without this a view silently reads
-- past row level security on the tables beneath it, and this one carries what
-- carriers charge us.
create or replace view public.freight_variance
  with (security_invoker = true) as
  select
    s.id             as shipment_id,
    s.reference,
    s.order_id,
    q.carrier_id,
    q.total_minor    as quoted_minor,
    s.carrier_invoice_minor as invoiced_minor,
    (s.carrier_invoice_minor - q.total_minor) as variance_minor,
    case
      when q.total_minor = 0 then null
      else round(
        ((s.carrier_invoice_minor - q.total_minor)::numeric / q.total_minor) * 100,
        2)
    end as variance_percent,
    q.chargeable_weight_kg as quoted_chargeable_kg,
    s.carrier_invoiced_at
  from public.shipments s
  join public.freight_quotes q on q.id = s.freight_quote_id
  where s.carrier_invoice_minor is not null;

-- How far a carrier's invoice may drift from the quote before somebody has
-- to look at it. A function rather than a constant so it can be changed in
-- one place once there is real data to set it from.
create or replace function app.freight_variance_tolerance()
returns numeric language sql immutable as $$ select 5.0::numeric $$;

-- ---------------------------------------------------------------------------
-- 8. Keeping updated_at honest
-- ---------------------------------------------------------------------------

-- The helper lives in the app schema, not public. Checking by bare proname
-- would find it and then call a function that does not exist under that
-- name, so the schema is named on both the test and the call.
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'touch_updated_at' and n.nspname = 'app'
  ) then
    drop trigger if exists carrier_lanes_touch on public.carrier_lanes;
    create trigger carrier_lanes_touch before update on public.carrier_lanes
      for each row execute function app.touch_updated_at();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 9. Who can see any of this
-- ---------------------------------------------------------------------------
-- Rate cards are commercially sensitive: a supplier must never see what a
-- carrier charges, and one carrier must never see another's rates. Only the
-- platform reads these tables. The buyer sees the single number that comes
-- out the other end, carried on the order.

alter table public.carrier_lanes      enable row level security;
alter table public.carrier_rate_cards enable row level security;
alter table public.carrier_rate_breaks enable row level security;
alter table public.carrier_surcharges enable row level security;
alter table public.freight_quotes     enable row level security;

drop policy if exists carrier_lanes_read on public.carrier_lanes;
create policy carrier_lanes_read on public.carrier_lanes
  for select to authenticated
  using (app.is_platform_admin());

drop policy if exists carrier_rate_cards_read on public.carrier_rate_cards;
create policy carrier_rate_cards_read on public.carrier_rate_cards
  for select to authenticated
  using (app.is_platform_admin());

drop policy if exists carrier_rate_breaks_read on public.carrier_rate_breaks;
create policy carrier_rate_breaks_read on public.carrier_rate_breaks
  for select to authenticated
  using (app.is_platform_admin());

drop policy if exists carrier_surcharges_read on public.carrier_surcharges;
create policy carrier_surcharges_read on public.carrier_surcharges
  for select to authenticated
  using (app.is_platform_admin());

-- A quote is readable by the parties to the order, because the buyer is
-- entitled to see how their freight charge was arrived at. The rate card
-- behind it stays hidden, which is why the quote stores its own copy of the
-- rate it used rather than making the reader join.
drop policy if exists freight_quotes_read on public.freight_quotes;
create policy freight_quotes_read on public.freight_quotes
  for select to authenticated
  using (app.is_platform_admin() or app.party_to_order(order_id));

revoke all on public.carrier_lanes, public.carrier_rate_cards,
              public.carrier_rate_breaks, public.carrier_surcharges,
              public.freight_quotes
  from anon, authenticated;

grant select on public.carrier_lanes, public.carrier_rate_cards,
                public.carrier_rate_breaks, public.carrier_surcharges,
                public.freight_quotes
  to authenticated;

revoke all on public.freight_variance, public.products_freight_ready
  from anon, authenticated;
grant select on public.freight_variance, public.products_freight_ready
  to authenticated;
