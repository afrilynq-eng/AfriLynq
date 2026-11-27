-- The carrier portal.
--
-- A logistics company signs in at a URL we give them, sees only the jobs
-- assigned to their own company, proposes what the job will cost, argues it
-- out with us, and reports movement as the goods travel.
--
-- Three decisions are worth stating before the schema, because they are the
-- reason it looks like this.
--
-- 1. No new platform role.
--    app.platform_role is an enum, Postgres will not let a value added to an
--    enum be used in the same transaction that adds it, and the Supabase SQL
--    editor runs a script as one transaction. There is also a guard trigger
--    on changing platform_role. A join table avoids all of that and models
--    the truth better anyway: being a carrier is a relationship to a company,
--    not a rank on the platform.
--
-- 2. Carriers never touch public.orders.
--    A haulier needs addresses, weights, pieces and a declared value. They do
--    not need to know what the buyer paid the supplier, who the buyer is as a
--    company, or what margin sits in the order. public.shipments already
--    carries its own copy of everything they legitimately need, so the portal
--    reads shipments and the order stays invisible.
--
-- 3. Carriers get no write grants at all.
--    Every carrier write goes through a security definer function that checks
--    the row belongs to them. A table grant would let a carrier with a
--    console mark their own shipment delivered, which releases the supplier's
--    money seven days later. The functions make that impossible rather than
--    unlikely.

-- ---------------------------------------------------------------------------
-- 1. Who may sign in on behalf of a carrier
-- ---------------------------------------------------------------------------

create table if not exists public.carrier_users (
  id         uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references public.carriers(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,

  -- Their name for the person, so we can tell two of their staff apart.
  role_title text,

  active     boolean not null default true,
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),

  -- One person acts for one carrier. If a broker ever works for two, that is
  -- two logins, because otherwise every query below has to ask "which one?".
  unique (user_id)
);

create index if not exists carrier_users_by_carrier
  on public.carrier_users (carrier_id) where active;

-- The whole authorisation model in one function. Returns the carrier this
-- user acts for, or null if they are not a carrier at all.
create or replace function app.carrier_id_for(uid uuid default auth.uid())
returns uuid
language sql
security definer
set search_path = public, app
stable
as $$
  select cu.carrier_id
  from public.carrier_users cu
  join public.carriers c on c.id = cu.carrier_id
  where cu.user_id = uid and cu.active and c.active
  limit 1;
$$;

create or replace function app.is_carrier_for_shipment(p_shipment_id uuid)
returns boolean
language sql
security definer
set search_path = public, app
stable
as $$
  select exists (
    select 1
    from public.shipments s
    where s.id = p_shipment_id
      and s.carrier_id is not null
      and s.carrier_id = app.carrier_id_for(auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. The cost conversation
-- ---------------------------------------------------------------------------
-- A thread, not a field. The carrier proposes, we counter, they counter back,
-- somebody accepts. Keeping every step means a disagreement three months later
-- is settled by reading rows rather than searching WhatsApp.

create table if not exists public.freight_proposals (
  id          uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  carrier_id  uuid not null references public.carriers(id) on delete restrict,

  -- Null on the first message in a thread, otherwise the proposal this one
  -- answers. Following parent_id back gives the whole negotiation in order.
  parent_id   uuid references public.freight_proposals(id) on delete cascade,

  -- Which side spoke. Not derived from the user, because an admin acting on
  -- a carrier's behalf after a phone call is still the carrier's number.
  proposed_by text not null,

  amount_minor numeric(16, 2) not null,
  currency     char(3) not null references public.currencies(code),

  -- The carrier's own measurement. Where this disagrees with ours, that is
  -- usually the real subject of the argument, so it is captured next to the
  -- money rather than buried in the note.
  chargeable_weight_kg numeric(10, 3),

  note text,

  status text not null default 'open',

  decided_by uuid references public.profiles(id),
  decided_at timestamptz,

  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),

  constraint freight_proposals_by check (proposed_by in ('carrier', 'admin')),
  constraint freight_proposals_status check (
    status in ('open', 'superseded', 'accepted', 'rejected', 'withdrawn')
  ),
  constraint freight_proposals_amount_non_negative check (amount_minor >= 0)
);

create index if not exists freight_proposals_shipment
  on public.freight_proposals (shipment_id, created_at);

-- At most one accepted price per shipment. The database enforces it because
-- "we agreed twice on different numbers" is not a state anyone can unpick.
create unique index if not exists freight_proposals_one_accepted
  on public.freight_proposals (shipment_id) where status = 'accepted';

-- What was finally agreed, carried on the shipment so nothing has to walk the
-- thread to find out what this job costs.
alter table public.shipments
  add column if not exists freight_agreed_minor    numeric(16, 2),
  add column if not exists freight_agreed_currency char(3)
    references public.currencies(code),
  add column if not exists freight_agreed_at       timestamptz,
  add column if not exists freight_proposal_id     uuid
    references public.freight_proposals(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3. Holding a carrier's updates back from the buyer
-- ---------------------------------------------------------------------------
-- Everything a carrier reports lands as a shipment_event. What changes is
-- whether the buyer sees it immediately.
--
-- Approving every event by hand sounds safe and is not: the buyer stops
-- seeing movement in real time, and whoever is approving becomes the slowest
-- part of the chain at 2am. So routine forward movement publishes itself, and
-- only the events that cost money or alarm somebody wait for a human.

alter table public.shipment_events
  add column if not exists approval_state   text not null default 'approved',
  add column if not exists approved_by      uuid references public.profiles(id),
  add column if not exists approved_at      timestamptz,
  add column if not exists review_note      text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shipment_events_approval_state'
  ) then
    alter table public.shipment_events add constraint shipment_events_approval_state
      check (approval_state in ('pending', 'approved', 'rejected'));
  end if;
end $$;

-- The three that are held back, and why:
--   delivered  starts the seven day clock that releases the supplier's money
--   exception  tells the buyer something has gone wrong
--   cancelled  ends the job
-- A carrier should not be able to do any of those unilaterally.
create or replace function app.event_needs_review(p_status text)
returns boolean language sql immutable as $$
  select p_status in ('delivered', 'exception', 'cancelled')
$$;

create or replace function app.set_event_approval()
returns trigger
language plpgsql
as $$
begin
  -- Only a carrier's word is held. Anything typed by our own staff, or
  -- inferred by the system, is already ours.
  if new.source = 'carrier' and app.event_needs_review(new.status) then
    new.approval_state := 'pending';
    new.approved_by := null;
    new.approved_at := null;
  elsif new.approval_state is null then
    new.approval_state := 'approved';
  end if;
  return new;
end;
$$;

drop trigger if exists shipment_events_approval on public.shipment_events;
create trigger shipment_events_approval
  before insert on public.shipment_events
  for each row execute function app.set_event_approval();

-- What the buyer and supplier are shown. Every existing read of
-- shipment_events for a buyer should move to this view, otherwise a pending
-- event leaks onto the tracking page and the hold means nothing.
-- security_invoker matters here more than anywhere else in this file. A view
-- in Postgres 15 and later runs as its owner unless told otherwise, which
-- would let it read straight past row level security on shipment_events and
-- hand every signed-in account the whole platform's movements. With it on,
-- the reader's own policies still apply and this view only narrows what they
-- could already see.
create or replace view public.shipment_events_public
  with (security_invoker = true) as
  select id, shipment_id, status, description, location,
         occurred_at, source, created_at
  from public.shipment_events
  where approval_state = 'approved';

-- ---------------------------------------------------------------------------
-- 4. What a carrier sees of a job
-- ---------------------------------------------------------------------------
-- Deliberately narrow. Everything here is already on the shipment, copied at
-- booking. No column reaches into orders, companies or quotations.

create or replace view public.carrier_jobs
  with (security_invoker = true) as
  select
    s.id                as shipment_id,
    s.reference,
    s.carrier_id,
    s.status,
    s.tracking_reference,
    s.service,
    s.pieces,
    s.gross_weight_kg,
    s.volume_m3,
    s.declared_value_minor,
    s.declared_currency,
    s.origin_country_code,
    s.destination_country_code,
    s.origin_address,
    s.destination_address,
    s.incoterm,
    s.booked_at,
    s.collected_at,
    s.delivered_at,
    s.expected_delivery,
    s.freight_agreed_minor,
    s.freight_agreed_currency,
    s.freight_agreed_at,
    -- So the portal can show "waiting on you" without a second query.
    (s.freight_agreed_at is null) as awaiting_price
  from public.shipments s
  where s.carrier_id = app.carrier_id_for(auth.uid());

-- ---------------------------------------------------------------------------
-- 5. Carrier writes, as functions
-- ---------------------------------------------------------------------------

create or replace function public.carrier_submit_proposal(
  p_shipment_id uuid,
  p_amount_minor numeric,
  p_currency char(3),
  p_chargeable_weight_kg numeric default null,
  p_note text default null,
  p_parent_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_carrier uuid;
  v_id uuid;
begin
  v_carrier := app.carrier_id_for(auth.uid());
  if v_carrier is null then
    raise exception 'Not a carrier account';
  end if;
  if not app.is_carrier_for_shipment(p_shipment_id) then
    raise exception 'That shipment is not assigned to you';
  end if;
  if p_amount_minor is null or p_amount_minor < 0 then
    raise exception 'A price is required';
  end if;
  -- Once a price is agreed the conversation is over. Reopening it is an
  -- admin action, not something a carrier can do by submitting again.
  if exists (
    select 1 from public.shipments
    where id = p_shipment_id and freight_agreed_at is not null
  ) then
    raise exception 'The price for this shipment has already been agreed';
  end if;

  -- Anything still open is answered by this, so the thread has one live
  -- number at a time.
  update public.freight_proposals
     set status = 'superseded'
   where shipment_id = p_shipment_id and status = 'open';

  insert into public.freight_proposals (
    shipment_id, carrier_id, parent_id, proposed_by,
    amount_minor, currency, chargeable_weight_kg, note, created_by
  ) values (
    p_shipment_id, v_carrier, p_parent_id, 'carrier',
    p_amount_minor, p_currency, p_chargeable_weight_kg, p_note, auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.carrier_record_event(
  p_shipment_id uuid,
  p_status text,
  p_description text default null,
  p_location text default null,
  p_occurred_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_id uuid;
begin
  if app.carrier_id_for(auth.uid()) is null then
    raise exception 'Not a carrier account';
  end if;
  if not app.is_carrier_for_shipment(p_shipment_id) then
    raise exception 'That shipment is not assigned to you';
  end if;

  insert into public.shipment_events (
    shipment_id, status, description, location,
    occurred_at, source, recorded_by
  ) values (
    p_shipment_id, p_status, p_description, p_location,
    p_occurred_at, 'carrier', auth.uid()
  )
  returning id into v_id;

  -- The shipment's own status only moves on events we have accepted. A
  -- pending 'delivered' changes nothing until somebody approves it, which is
  -- the entire point of holding it.
  update public.shipments s
     set status = p_status
   where s.id = p_shipment_id
     and exists (
       select 1 from public.shipment_events e
       where e.id = v_id and e.approval_state = 'approved'
     );

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Admin side of both conversations
-- ---------------------------------------------------------------------------

create or replace function public.admin_respond_to_proposal(
  p_proposal_id uuid,
  p_action text,                      -- 'accept' | 'counter' | 'reject'
  p_counter_minor numeric default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_p public.freight_proposals%rowtype;
  v_new uuid;
begin
  if not app.is_platform_admin() then
    raise exception 'Admins only';
  end if;

  select * into v_p from public.freight_proposals where id = p_proposal_id;
  if not found then raise exception 'No such proposal'; end if;
  if v_p.status <> 'open' then
    raise exception 'That proposal is no longer open';
  end if;

  if p_action = 'accept' then
    update public.freight_proposals
       set status = 'accepted', decided_by = auth.uid(), decided_at = now()
     where id = p_proposal_id;

    update public.shipments
       set freight_agreed_minor = v_p.amount_minor,
           freight_agreed_currency = v_p.currency,
           freight_agreed_at = now(),
           freight_proposal_id = p_proposal_id
     where id = v_p.shipment_id;

    return p_proposal_id;

  elsif p_action = 'reject' then
    update public.freight_proposals
       set status = 'rejected', decided_by = auth.uid(), decided_at = now(),
           note = coalesce(p_note, note)
     where id = p_proposal_id;
    return p_proposal_id;

  elsif p_action = 'counter' then
    if p_counter_minor is null or p_counter_minor < 0 then
      raise exception 'A counter needs a figure';
    end if;
    update public.freight_proposals
       set status = 'superseded', decided_by = auth.uid(), decided_at = now()
     where id = p_proposal_id;

    insert into public.freight_proposals (
      shipment_id, carrier_id, parent_id, proposed_by,
      amount_minor, currency, note, created_by
    ) values (
      v_p.shipment_id, v_p.carrier_id, p_proposal_id, 'admin',
      p_counter_minor, v_p.currency, p_note, auth.uid()
    )
    returning id into v_new;

    return v_new;
  end if;

  raise exception 'Unknown action: %', p_action;
end;
$$;

create or replace function public.admin_review_event(
  p_event_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_e public.shipment_events%rowtype;
begin
  if not app.is_platform_admin() then
    raise exception 'Admins only';
  end if;

  select * into v_e from public.shipment_events where id = p_event_id;
  if not found then raise exception 'No such event'; end if;
  if v_e.approval_state <> 'pending' then
    raise exception 'That event has already been reviewed';
  end if;

  update public.shipment_events
     set approval_state = case when p_approve then 'approved' else 'rejected' end,
         approved_by = auth.uid(),
         approved_at = now(),
         review_note = p_note
   where id = p_event_id;

  -- Approving is what actually moves the shipment, and for 'delivered' it is
  -- what starts the seven day release clock downstream.
  if p_approve then
    update public.shipments
       set status = v_e.status,
           delivered_at = case when v_e.status = 'delivered'
                               then coalesce(delivered_at, v_e.occurred_at)
                               else delivered_at end
     where id = v_e.shipment_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Reading rules
-- ---------------------------------------------------------------------------

alter table public.carrier_users      enable row level security;
alter table public.freight_proposals  enable row level security;

drop policy if exists carrier_users_read on public.carrier_users;
create policy carrier_users_read on public.carrier_users
  for select to authenticated
  using (app.is_platform_admin() or user_id = auth.uid());

-- A carrier reads their own thread. The buyer and supplier do not: what we
-- pay a haulier is between us and the haulier.
drop policy if exists freight_proposals_read on public.freight_proposals;
create policy freight_proposals_read on public.freight_proposals
  for select to authenticated
  using (
    app.is_platform_admin()
    or carrier_id = app.carrier_id_for(auth.uid())
  );

-- Carriers see their own shipments and their own events. These extend the
-- existing policies rather than replacing them: Postgres ORs permissive
-- policies together, so the buyer and supplier rules still stand.
drop policy if exists shipments_read_carrier on public.shipments;
create policy shipments_read_carrier on public.shipments
  for select to authenticated
  using (carrier_id is not null and carrier_id = app.carrier_id_for(auth.uid()));

drop policy if exists shipment_events_read_carrier on public.shipment_events;
create policy shipment_events_read_carrier on public.shipment_events
  for select to authenticated
  using (
    exists (
      select 1 from public.shipments s
      where s.id = shipment_events.shipment_id
        and s.carrier_id is not null
        and s.carrier_id = app.carrier_id_for(auth.uid())
    )
  );

-- A carrier may read the row for their own company and nobody else's.
drop policy if exists carriers_read_self on public.carriers;
create policy carriers_read_self on public.carriers
  for select to authenticated
  using (id = app.carrier_id_for(auth.uid()));

-- ---------------------------------------------------------------------------
-- 8. Grants
-- ---------------------------------------------------------------------------
-- Select only, everywhere. Every write above is a function.

revoke all on public.carrier_users, public.freight_proposals from anon, authenticated;
grant select on public.carrier_users, public.freight_proposals to authenticated;

revoke all on public.carrier_jobs, public.shipment_events_public from anon, authenticated;
grant select on public.carrier_jobs, public.shipment_events_public to authenticated;

revoke all on function public.carrier_submit_proposal(uuid, numeric, char, numeric, text, uuid)
  from anon;
revoke all on function public.carrier_record_event(uuid, text, text, text, timestamptz)
  from anon;
revoke all on function public.admin_respond_to_proposal(uuid, text, numeric, text) from anon;
revoke all on function public.admin_review_event(uuid, boolean, text) from anon;

grant execute on function public.carrier_submit_proposal(uuid, numeric, char, numeric, text, uuid)
  to authenticated;
grant execute on function public.carrier_record_event(uuid, text, text, text, timestamptz)
  to authenticated;
grant execute on function public.admin_respond_to_proposal(uuid, text, numeric, text)
  to authenticated;
grant execute on function public.admin_review_event(uuid, boolean, text)
  to authenticated;
