-- AfriLynq platform
-- Migration 0003: enquiries, quotations, orders
--
-- This is the part of the schema that is expensive to get wrong.
--
-- Rule one: a negotiation is never overwritten. A revised quotation is a new
-- row that points at the one it replaces. Six months later, when a buyer and a
-- supplier disagree about what was offered, the history has to exist.
--
-- Rule two: money is an integer in the minor unit of a named currency. There
-- are no floats. A currency is stored on every row that carries a figure.

-- ---------------------------------------------------------------------------
-- Enquiries
-- A buyer asking a supplier for a price. This is the request in
-- request for quotation, and it is the heart of the product.
-- ---------------------------------------------------------------------------

create table public.enquiries (
  id                      uuid primary key default gen_random_uuid(),
  reference               text not null unique,
  buyer_company_id        uuid not null references public.companies(id) on delete restrict,
  supplier_company_id     uuid not null references public.companies(id) on delete restrict,
  product_id              uuid references public.products(id) on delete set null,
  category_id             uuid references public.categories(id) on delete set null,

  -- Snapshot of what was asked for, kept even if the product is later edited
  product_name_snapshot   text,
  quantity                numeric(14,3) not null,
  unit_code               text not null references public.units(code),
  required_by             date,
  delivery_country_code   char(2) references public.countries(code),
  delivery_city           text,
  incoterm                text,
  target_currency         char(3) references public.currencies(code),
  target_price_minor      bigint,
  message                 text,

  status                  app.enquiry_status not null default 'open',
  closed_reason           text,
  first_response_at       timestamptz,
  created_by              uuid not null references public.profiles(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint enquiries_quantity_positive check (quantity > 0),
  constraint enquiries_parties_differ check (buyer_company_id <> supplier_company_id)
);

create index enquiries_buyer_idx on public.enquiries (buyer_company_id, created_at desc);
create index enquiries_supplier_idx on public.enquiries (supplier_company_id, created_at desc);
create index enquiries_status_idx on public.enquiries (status);
create index enquiries_product_idx on public.enquiries (product_id);

create trigger enquiries_touch
  before update on public.enquiries
  for each row execute function app.touch_updated_at();

-- Human readable references. Buyers and suppliers quote these on the phone.
create sequence if not exists app.enquiry_ref_seq start 1000;
create sequence if not exists app.quotation_ref_seq start 1000;
create sequence if not exists app.order_ref_seq start 1000;

create or replace function app.set_enquiry_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference is null then
    new.reference := 'ENQ-' || to_char(now(), 'YY') || '-' ||
                     lpad(nextval('app.enquiry_ref_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create trigger enquiries_reference
  before insert on public.enquiries
  for each row execute function app.set_enquiry_reference();

-- ---------------------------------------------------------------------------
-- Quotations
-- Immutable once sent. A revision is a new row with a higher version that
-- points at its parent. supersedes_id gives you the full chain.
-- ---------------------------------------------------------------------------

create table public.quotations (
  id                      uuid primary key default gen_random_uuid(),
  reference               text not null unique,
  enquiry_id              uuid not null references public.enquiries(id) on delete restrict,
  supplier_company_id     uuid not null references public.companies(id) on delete restrict,
  buyer_company_id        uuid not null references public.companies(id) on delete restrict,

  version                 smallint not null default 1,
  supersedes_id           uuid references public.quotations(id) on delete set null,

  status                  app.quotation_status not null default 'draft',
  currency                char(3) not null references public.currencies(code),
  subtotal_minor          bigint not null default 0,
  shipping_minor          bigint not null default 0,
  other_charges_minor     bigint not null default 0,
  total_minor             bigint not null default 0,

  incoterm                text,
  lead_time_days          smallint,
  payment_terms           text,
  packaging_notes         text,
  notes                   text,
  valid_until             date,

  sent_at                 timestamptz,
  responded_at            timestamptz,
  decline_reason          text,

  created_by              uuid not null references public.profiles(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  unique (enquiry_id, version),
  constraint quotations_amounts_non_negative check (
    subtotal_minor >= 0 and shipping_minor >= 0
    and other_charges_minor >= 0 and total_minor >= 0
  )
);

create index quotations_enquiry_idx on public.quotations (enquiry_id, version desc);
create index quotations_supplier_idx on public.quotations (supplier_company_id, created_at desc);
create index quotations_buyer_idx on public.quotations (buyer_company_id, created_at desc);
create index quotations_status_idx on public.quotations (status);

create trigger quotations_touch
  before update on public.quotations
  for each row execute function app.touch_updated_at();

create or replace function app.set_quotation_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference is null then
    new.reference := 'QUO-' || to_char(now(), 'YY') || '-' ||
                     lpad(nextval('app.quotation_ref_seq')::text, 5, '0') ||
                     case when new.version > 1 then '-R' || new.version::text else '' end;
  end if;
  return new;
end;
$$;

create trigger quotations_reference
  before insert on public.quotations
  for each row execute function app.set_quotation_reference();

-- Once a quotation leaves draft, its commercial content is frozen. Only the
-- status and the response fields may change. A different price means a new
-- version, never an edit.
create or replace function app.guard_quotation_immutability()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'draft' then
    return new;
  end if;

  if new.currency is distinct from old.currency
     or new.subtotal_minor is distinct from old.subtotal_minor
     or new.shipping_minor is distinct from old.shipping_minor
     or new.other_charges_minor is distinct from old.other_charges_minor
     or new.total_minor is distinct from old.total_minor
     or new.incoterm is distinct from old.incoterm
     or new.lead_time_days is distinct from old.lead_time_days
     or new.payment_terms is distinct from old.payment_terms
     or new.packaging_notes is distinct from old.packaging_notes
     or new.notes is distinct from old.notes
     or new.valid_until is distinct from old.valid_until
     or new.enquiry_id is distinct from old.enquiry_id
     or new.version is distinct from old.version
  then
    raise exception
      'Quotation % has been sent and cannot be edited. Create a new version instead.',
      old.reference
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger quotations_immutable
  before update on public.quotations
  for each row execute function app.guard_quotation_immutability();

-- ---------------------------------------------------------------------------
-- Quotation lines
-- ---------------------------------------------------------------------------

create table public.quotation_lines (
  id                  uuid primary key default gen_random_uuid(),
  quotation_id        uuid not null references public.quotations(id) on delete cascade,
  product_id          uuid references public.products(id) on delete set null,
  description         text not null,
  quantity            numeric(14,3) not null,
  unit_code           text not null references public.units(code),
  unit_price_minor    bigint not null,
  line_total_minor    bigint generated always as
                        (round(quantity * unit_price_minor)::bigint) stored,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  constraint quotation_lines_quantity_positive check (quantity > 0),
  constraint quotation_lines_price_non_negative check (unit_price_minor >= 0)
);

create index quotation_lines_quotation_idx on public.quotation_lines (quotation_id, sort_order);

-- Lines are frozen along with their quotation.
create or replace function app.guard_quotation_lines()
returns trigger
language plpgsql
as $$
declare
  parent_status app.quotation_status;
  parent_ref    text;
begin
  select status, reference into parent_status, parent_ref
  from public.quotations
  where id = coalesce(new.quotation_id, old.quotation_id);

  if parent_status is not null and parent_status <> 'draft' then
    raise exception
      'Quotation % has been sent. Its lines cannot be changed.', parent_ref
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger quotation_lines_immutable
  before insert or update or delete on public.quotation_lines
  for each row execute function app.guard_quotation_lines();

-- ---------------------------------------------------------------------------
-- Orders
-- Created only from an accepted quotation. The quotation is the contract, so
-- the order carries a copy of the agreed figures rather than a live reference.
-- ---------------------------------------------------------------------------

create table public.orders (
  id                      uuid primary key default gen_random_uuid(),
  reference               text not null unique,
  quotation_id            uuid not null references public.quotations(id) on delete restrict,
  enquiry_id              uuid not null references public.enquiries(id) on delete restrict,
  buyer_company_id        uuid not null references public.companies(id) on delete restrict,
  supplier_company_id     uuid not null references public.companies(id) on delete restrict,

  status                  app.order_status not null default 'confirmed',

  currency                char(3) not null references public.currencies(code),
  total_minor             bigint not null,
  commission_rate         numeric(5,2),
  commission_minor        bigint,

  incoterm                text,
  delivery_country_code   char(2) references public.countries(code),
  delivery_address        text,
  expected_ship_date      date,
  expected_delivery_date  date,
  shipped_at              timestamptz,
  delivered_at            timestamptz,
  completed_at            timestamptz,

  -- Delivery confirmation code. Stored as a hash, never in clear text.
  delivery_code_hash      text,
  delivery_code_set_at    timestamptz,
  delivery_confirmed_at   timestamptz,

  carrier_name            text,
  tracking_reference      text,

  dispute_opened_at       timestamptz,
  dispute_reason          text,
  dispute_resolved_at     timestamptz,
  cancelled_at            timestamptz,
  cancellation_reason     text,

  created_by              uuid not null references public.profiles(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint orders_total_non_negative check (total_minor >= 0)
);

create index orders_buyer_idx on public.orders (buyer_company_id, created_at desc);
create index orders_supplier_idx on public.orders (supplier_company_id, created_at desc);
create index orders_status_idx on public.orders (status);
create unique index orders_quotation_idx on public.orders (quotation_id);

create trigger orders_touch
  before update on public.orders
  for each row execute function app.touch_updated_at();

create or replace function app.set_order_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference is null then
    new.reference := 'ORD-' || to_char(now(), 'YY') || '-' ||
                     lpad(nextval('app.order_ref_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create trigger orders_reference
  before insert on public.orders
  for each row execute function app.set_order_reference();

-- ---------------------------------------------------------------------------
-- Order events
-- Append only. This is the timeline both parties see and the evidence trail if
-- a dispute is raised.
-- ---------------------------------------------------------------------------

create table public.order_events (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  from_status     app.order_status,
  to_status       app.order_status,
  event_type      text not null,
  note            text,
  metadata        jsonb not null default '{}'::jsonb,
  actor_id        uuid references public.profiles(id),
  actor_company_id uuid references public.companies(id),
  created_at      timestamptz not null default now()
);

create index order_events_order_idx on public.order_events (order_id, created_at);

create or replace function app.block_order_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Order events are append only.' using errcode = 'check_violation';
end;
$$;

create trigger order_events_append_only
  before update or delete on public.order_events
  for each row execute function app.block_order_event_mutation();

-- Record every status change automatically.
create or replace function app.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_events (order_id, from_status, to_status, event_type, actor_id)
    values (new.id, old.status, new.status, 'status_change', auth.uid());
  end if;
  return new;
end;
$$;

create trigger orders_log_status
  after update on public.orders
  for each row execute function app.log_order_status_change();

alter table public.enquiries        enable row level security;
alter table public.quotations       enable row level security;
alter table public.quotation_lines  enable row level security;
alter table public.orders           enable row level security;
alter table public.order_events     enable row level security;
