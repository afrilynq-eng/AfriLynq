-- AfriLynq platform
-- Migration 0002: catalogue
-- Categories, products, product images.
--
-- Products are the acquisition channel. Every field that a search engine or a
-- buyer in another country needs to judge the listing lives here, and the page
-- is server rendered from this table.

-- ---------------------------------------------------------------------------
-- Categories
-- Self referencing so that Fresh Produce > Citrus > Oranges works without a
-- second table. Kept shallow in practice.
-- ---------------------------------------------------------------------------

create table public.categories (
  id              uuid primary key default gen_random_uuid(),
  parent_id       uuid references public.categories(id) on delete restrict,
  slug            text not null unique,
  name            text not null,
  description     text,
  icon_name       text,
  image_path      text,
  sort_order      integer not null default 100,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint categories_not_self_parent check (parent_id is null or parent_id <> id)
);

create index categories_parent_idx on public.categories (parent_id);
create index categories_active_idx on public.categories (is_active) where is_active = true;

create trigger categories_touch
  before update on public.categories
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Products
--
-- Prices are indicative only. The binding number is the one on a quotation.
-- All money is stored as an integer in the minor unit of its currency. There
-- are no floats anywhere in this database that represent money.
-- ---------------------------------------------------------------------------

create table public.products (
  id                        uuid primary key default gen_random_uuid(),
  company_id                uuid not null references public.companies(id) on delete cascade,
  category_id               uuid not null references public.categories(id) on delete restrict,
  slug                      text not null,
  name                      text not null,
  summary                   text,
  description               text,
  status                    app.product_status not null default 'draft',

  -- Trade terms
  unit_code                 text not null references public.units(code),
  min_order_quantity        numeric(14,3),
  max_monthly_capacity      numeric(14,3),
  lead_time_days            smallint,
  origin_country_code       char(2) references public.countries(code),
  origin_region             text,
  harvest_months            smallint[],
  packaging                 text,
  shelf_life_days           smallint,
  incoterms                 text[],

  -- Indicative pricing, minor units
  price_currency            char(3) references public.currencies(code),
  price_min_minor           bigint,
  price_max_minor           bigint,
  price_is_public           boolean not null default true,

  -- Merchandising
  is_featured               boolean not null default false,
  view_count                integer not null default 0,
  enquiry_count             integer not null default 0,

  published_at              timestamptz,
  created_by                uuid references public.profiles(id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  unique (company_id, slug),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint products_price_order check (
    price_min_minor is null
    or price_max_minor is null
    or price_max_minor >= price_min_minor
  ),
  constraint products_price_non_negative check (
    coalesce(price_min_minor, 0) >= 0 and coalesce(price_max_minor, 0) >= 0
  ),
  constraint products_price_needs_currency check (
    (price_min_minor is null and price_max_minor is null) or price_currency is not null
  )
);

create index products_company_idx on public.products (company_id);
create index products_category_idx on public.products (category_id);
create index products_status_idx on public.products (status) where status = 'active';
create index products_origin_idx on public.products (origin_country_code);
create index products_featured_idx on public.products (is_featured) where is_featured = true;

-- Full text search. Postgres does this well enough that a separate search
-- service is not justified at this stage.
alter table public.products
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) stored;

create index products_search_idx on public.products using gin (search_vector);
create index products_name_trgm_idx on public.products using gin (name gin_trgm_ops);

create trigger products_touch
  before update on public.products
  for each row execute function app.touch_updated_at();

-- A product is public only when it is active and its company is public.
create or replace function app.product_is_public(pid uuid)
returns boolean
language sql
security definer
set search_path = public, app
stable
as $$
  select exists (
    select 1
    from public.products p
    join public.companies c on c.id = p.company_id
    where p.id = pid
      and p.status = 'active'
      and c.verification_status = 'verified'
      and c.is_listed = true
  );
$$;

grant execute on function app.product_is_public(uuid) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Product images
-- ---------------------------------------------------------------------------

create table public.product_images (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products(id) on delete cascade,
  storage_path    text not null,
  alt_text        text,
  sort_order      integer not null default 0,
  width           integer,
  height          integer,
  bytes           integer,
  created_at      timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, sort_order);

alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.product_images  enable row level security;
