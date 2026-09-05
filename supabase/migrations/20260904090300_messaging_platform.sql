-- AfriLynq platform
-- Migration 0004: messaging, notifications, audit, leads
--
-- Messaging is scoped to a thread that belongs to two companies. It is not a
-- general chat. Every thread hangs off an enquiry or an order so that there is
-- always commercial context and so that access control is decidable.

create table public.message_threads (
  id                  uuid primary key default gen_random_uuid(),
  subject             text,
  enquiry_id          uuid references public.enquiries(id) on delete cascade,
  order_id            uuid references public.orders(id) on delete cascade,
  buyer_company_id    uuid not null references public.companies(id) on delete cascade,
  supplier_company_id uuid not null references public.companies(id) on delete cascade,
  last_message_at     timestamptz,
  is_closed           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint message_threads_context check (
    enquiry_id is not null or order_id is not null
  )
);

create index message_threads_buyer_idx on public.message_threads (buyer_company_id, last_message_at desc);
create index message_threads_supplier_idx on public.message_threads (supplier_company_id, last_message_at desc);
create unique index message_threads_enquiry_idx on public.message_threads (enquiry_id) where enquiry_id is not null;

create trigger message_threads_touch
  before update on public.message_threads
  for each row execute function app.touch_updated_at();

create table public.messages (
  id                  uuid primary key default gen_random_uuid(),
  thread_id           uuid not null references public.message_threads(id) on delete cascade,
  sender_id           uuid not null references public.profiles(id) on delete restrict,
  sender_company_id   uuid not null references public.companies(id) on delete restrict,
  body                text not null,
  attachment_paths    text[] not null default '{}',
  read_by_buyer_at    timestamptz,
  read_by_supplier_at timestamptz,
  created_at          timestamptz not null default now(),
  constraint messages_body_not_empty check (length(trim(body)) > 0)
);

create index messages_thread_idx on public.messages (thread_id, created_at);

-- Messages are not editable or deletable by users. This matters the first time
-- a party claims something was never said.
create or replace function app.block_message_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Messages cannot be edited or deleted.' using errcode = 'check_violation';
end;
$$;

create trigger messages_immutable
  before update or delete on public.messages
  for each row execute function app.block_message_mutation();

create or replace function app.bump_thread_activity()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
begin
  update public.message_threads
  set last_message_at = new.created_at
  where id = new.thread_id;
  return new;
end;
$$;

create trigger messages_bump_thread
  after insert on public.messages
  for each row execute function app.bump_thread_activity();

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  company_id      uuid references public.companies(id) on delete cascade,
  kind            text not null,
  title           text not null,
  body            text,
  link_path       text,
  metadata        jsonb not null default '{}'::jsonb,
  read_at         timestamptz,
  emailed_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- Audit log
-- Written by the service role only. No user role may read it.
-- ---------------------------------------------------------------------------

create table public.audit_log (
  id              bigserial primary key,
  actor_id        uuid,
  actor_email     text,
  action          text not null,
  entity_type     text not null,
  entity_id       uuid,
  before_state    jsonb,
  after_state     jsonb,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log (entity_type, entity_id, created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Leads
-- Phase 1 only. Before the marketplace exists, the site captures interest from
-- suppliers and buyers so that launch is not a cold start.
-- ---------------------------------------------------------------------------

create table public.leads (
  id                  uuid primary key default gen_random_uuid(),
  lead_type           text not null,
  full_name           text not null,
  email               text not null,
  phone               text,
  company_name        text,
  country_code        char(2) references public.countries(code),
  categories_of_interest text[],
  message             text,
  source              text,
  utm                 jsonb not null default '{}'::jsonb,
  contacted_at        timestamptz,
  converted_company_id uuid references public.companies(id) on delete set null,
  notes               text,
  created_at          timestamptz not null default now(),
  constraint leads_type_valid check (lead_type in ('supplier', 'buyer', 'other')),
  constraint leads_email_shape check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index leads_created_idx on public.leads (created_at desc);
create index leads_type_idx on public.leads (lead_type);
create unique index leads_email_type_idx on public.leads (lower(email), lead_type);

alter table public.message_threads  enable row level security;
alter table public.messages         enable row level security;
alter table public.notifications    enable row level security;
alter table public.audit_log        enable row level security;
alter table public.leads            enable row level security;
