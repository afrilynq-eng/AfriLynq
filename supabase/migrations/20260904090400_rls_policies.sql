-- AfriLynq platform
-- Migration 0005: row level security policies
--
-- Every policy lives in this one file on purpose. Access control that is
-- scattered across ten migrations is access control nobody reviews.
--
-- Three principals:
--   anon           an unauthenticated visitor, which includes Google
--   authenticated  a signed in person, acting through their companies
--   service_role   server side code, bypasses RLS entirely
--
-- The rule that drives most of this file: a person has no permissions of their
-- own beyond their profile. Permissions come from company membership.

-- ---------------------------------------------------------------------------
-- Reference data. Public read, admin write.
-- ---------------------------------------------------------------------------

create policy countries_read on public.countries
  for select to anon, authenticated using (is_active = true);

create policy countries_admin on public.countries
  for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

create policy currencies_read on public.currencies
  for select to anon, authenticated using (is_active = true);

create policy currencies_admin on public.currencies
  for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

create policy units_read on public.units
  for select to anon, authenticated using (is_active = true);

create policy units_admin on public.units
  for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

create policy categories_read on public.categories
  for select to anon, authenticated using (is_active = true);

create policy categories_admin on public.categories
  for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Profiles
-- A profile is private. You see your own, and you see the people in your own
-- companies. There is no public directory of people.
-- ---------------------------------------------------------------------------

revoke select on public.profiles from anon;

create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_select_colleagues on public.profiles
  for select to authenticated
  using (
    exists (
      select 1
      from public.company_members m
      where m.user_id = public.profiles.id
        and m.status = 'active'
        and m.company_id in (select app.company_ids_for(auth.uid()))
    )
  );

create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (app.is_platform_admin());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_admin_write on public.profiles
  for all to authenticated
  using (app.is_platform_admin())
  with check (app.is_platform_admin());

-- A user must not be able to promote themselves to platform admin.
-- Server side code runs with no JWT, so auth.uid() is null. The guard triggers
-- below must not fire in that context, otherwise migrations, admin tooling and
-- route handlers using the service key cannot do their job.
create or replace function app.is_service_context()
returns boolean
language sql
stable
as $$
  select auth.uid() is null;
$$;

create or replace function app.guard_platform_role()
returns trigger
language plpgsql
as $$
begin
  if app.is_service_context() then
    return new;
  end if;

  if new.platform_role is distinct from old.platform_role
     and not app.is_platform_admin(auth.uid())
  then
    raise exception 'Platform role can only be changed by a platform administrator.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function app.guard_platform_role();

-- ---------------------------------------------------------------------------
-- Companies
-- Verified and listed companies are readable by everyone, including search
-- engines. That visibility is the acquisition channel, so it is deliberate.
-- Everything else is visible only to its own members.
-- ---------------------------------------------------------------------------

create policy companies_public_read on public.companies
  for select to anon, authenticated
  using (verification_status = 'verified' and is_listed = true);

create policy companies_member_read on public.companies
  for select to authenticated
  using (id in (select app.company_ids_for(auth.uid())));

create policy companies_admin_read on public.companies
  for select to authenticated
  using (app.is_platform_admin());

create policy companies_insert on public.companies
  for insert to authenticated
  with check (created_by = auth.uid());

create policy companies_member_update on public.companies
  for update to authenticated
  using (app.is_company_admin(id))
  with check (app.is_company_admin(id));

create policy companies_admin_write on public.companies
  for all to authenticated
  using (app.is_platform_admin())
  with check (app.is_platform_admin());

-- Verification is a platform decision, not a company one. A supplier must not
-- be able to mark itself verified by writing to its own row.
create or replace function app.guard_company_verification()
returns trigger
language plpgsql
as $$
begin
  if app.is_service_context() then
    return new;
  end if;

  if not app.is_platform_admin(auth.uid()) then
    if new.verification_status is distinct from old.verification_status
       or new.verified_at is distinct from old.verified_at
       or new.verified_by is distinct from old.verified_by
       or new.is_listed is distinct from old.is_listed
       or new.response_rate is distinct from old.response_rate
    then
      raise exception 'Verification and listing status are set by AfriLynq, not by the company.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

create trigger companies_guard_verification
  before update on public.companies
  for each row execute function app.guard_company_verification();

-- ---------------------------------------------------------------------------
-- Company members
-- Note every policy here reads membership through app.company_ids_for, which
-- is SECURITY DEFINER. Reading company_members directly inside a policy on
-- company_members recurses forever.
-- ---------------------------------------------------------------------------

create policy company_members_read on public.company_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or company_id in (select app.company_ids_for(auth.uid()))
    or app.is_platform_admin()
  );

create policy company_members_manage on public.company_members
  for all to authenticated
  using (app.is_company_admin(company_id) or app.is_platform_admin())
  with check (app.is_company_admin(company_id) or app.is_platform_admin());

-- A company must never be left without an owner.
create or replace function app.guard_last_owner()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
declare
  owner_count integer;
begin
  if tg_op = 'DELETE' or new.member_role <> 'owner' or new.status <> 'active' then
    select count(*) into owner_count
    from public.company_members
    where company_id = old.company_id
      and member_role = 'owner'
      and status = 'active'
      and id <> old.id;

    if old.member_role = 'owner' and old.status = 'active' and owner_count = 0 then
      raise exception 'A company must always have at least one active owner.'
        using errcode = 'check_violation';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger company_members_guard_owner
  before update or delete on public.company_members
  for each row execute function app.guard_last_owner();

-- Creating a company and becoming its owner has to happen together or not at
-- all. Call this from the app rather than inserting into companies directly.
create or replace function public.create_company(
  p_legal_name    text,
  p_slug          text,
  p_company_type  app.company_type,
  p_country_code  char(2),
  p_contact_email text default null,
  p_contact_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, app
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = 'insufficient_privilege';
  end if;

  insert into public.companies (
    legal_name, slug, company_type, country_code,
    contact_email, contact_phone, created_by
  )
  values (
    p_legal_name, p_slug, p_company_type, p_country_code,
    p_contact_email, p_contact_phone, auth.uid()
  )
  returning id into new_id;

  insert into public.company_members (company_id, user_id, member_role, status, joined_at)
  values (new_id, auth.uid(), 'owner', 'active', now());

  return new_id;
end;
$$;

grant execute on function public.create_company(text, text, app.company_type, char, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Certifications
-- The metadata is public for a verified company because it is what makes a
-- stranger in another country trust the listing. The document itself is not.
-- Column level grants do what a row policy cannot.
-- ---------------------------------------------------------------------------

revoke select on public.certifications from anon, authenticated;

grant select (id, company_id, name, issuing_body, issued_on, expires_on, status, created_at)
  on public.certifications to anon;

grant select on public.certifications to authenticated;

create policy certifications_public_read on public.certifications
  for select to anon
  using (status = 'verified' and app.company_is_public(company_id));

create policy certifications_member_read on public.certifications
  for select to authenticated
  using (company_id in (select app.company_ids_for(auth.uid())) or app.is_platform_admin());

create policy certifications_member_write on public.certifications
  for all to authenticated
  using (app.is_company_admin(company_id) or app.is_platform_admin())
  with check (app.is_company_admin(company_id) or app.is_platform_admin());

-- Review outcome is a platform decision.
create or replace function app.guard_certification_review()
returns trigger
language plpgsql
as $$
begin
  if app.is_service_context() then
    return new;
  end if;

  if not app.is_platform_admin(auth.uid()) then
    if new.status is distinct from old.status
       or new.reviewed_by is distinct from old.reviewed_by
       or new.reviewed_at is distinct from old.reviewed_at
    then
      raise exception 'Certification status is set by AfriLynq.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

create trigger certifications_guard_review
  before update on public.certifications
  for each row execute function app.guard_certification_review();

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------

create policy products_public_read on public.products
  for select to anon, authenticated
  using (status = 'active' and app.company_is_public(company_id));

create policy products_member_read on public.products
  for select to authenticated
  using (company_id in (select app.company_ids_for(auth.uid())) or app.is_platform_admin());

create policy products_member_write on public.products
  for insert to authenticated
  with check (app.is_member_of(company_id));

create policy products_member_update on public.products
  for update to authenticated
  using (app.is_member_of(company_id))
  with check (app.is_member_of(company_id));

create policy products_admin_delete on public.products
  for delete to authenticated
  using (app.is_company_admin(company_id) or app.is_platform_admin());

create policy products_admin_all on public.products
  for all to authenticated
  using (app.is_platform_admin())
  with check (app.is_platform_admin());

create policy product_images_public_read on public.product_images
  for select to anon, authenticated
  using (app.product_is_public(product_id));

create policy product_images_member_all on public.product_images
  for all to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and (p.company_id in (select app.company_ids_for(auth.uid())) or app.is_platform_admin())
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and (app.is_member_of(p.company_id) or app.is_platform_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- Enquiries
-- Visible to the two companies involved and to nobody else. Not to anon, and
-- not to other suppliers, which is the difference between a marketplace and a
-- leaked order book.
-- ---------------------------------------------------------------------------

create policy enquiries_party_read on public.enquiries
  for select to authenticated
  using (
    buyer_company_id in (select app.company_ids_for(auth.uid()))
    or supplier_company_id in (select app.company_ids_for(auth.uid()))
    or app.is_platform_admin()
  );

create policy enquiries_buyer_insert on public.enquiries
  for insert to authenticated
  with check (
    app.is_member_of(buyer_company_id)
    and created_by = auth.uid()
    and app.company_is_public(supplier_company_id)
  );

create policy enquiries_party_update on public.enquiries
  for update to authenticated
  using (
    buyer_company_id in (select app.company_ids_for(auth.uid()))
    or supplier_company_id in (select app.company_ids_for(auth.uid()))
    or app.is_platform_admin()
  )
  with check (
    buyer_company_id in (select app.company_ids_for(auth.uid()))
    or supplier_company_id in (select app.company_ids_for(auth.uid()))
    or app.is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- Quotations and lines
-- The supplier writes them. The buyer reads them and responds. Content is
-- frozen once sent by the trigger in migration 0003, so a revision is a new
-- row and the negotiation history survives.
-- ---------------------------------------------------------------------------

create policy quotations_party_read on public.quotations
  for select to authenticated
  using (
    supplier_company_id in (select app.company_ids_for(auth.uid()))
    or (
      buyer_company_id in (select app.company_ids_for(auth.uid()))
      and status <> 'draft'
    )
    or app.is_platform_admin()
  );

create policy quotations_supplier_insert on public.quotations
  for insert to authenticated
  with check (app.is_member_of(supplier_company_id) and created_by = auth.uid());

create policy quotations_party_update on public.quotations
  for update to authenticated
  using (
    supplier_company_id in (select app.company_ids_for(auth.uid()))
    or (buyer_company_id in (select app.company_ids_for(auth.uid())) and status = 'sent')
    or app.is_platform_admin()
  )
  with check (
    supplier_company_id in (select app.company_ids_for(auth.uid()))
    or buyer_company_id in (select app.company_ids_for(auth.uid()))
    or app.is_platform_admin()
  );

create policy quotation_lines_read on public.quotation_lines
  for select to authenticated
  using (
    exists (
      select 1 from public.quotations q
      where q.id = quotation_lines.quotation_id
        and (
          q.supplier_company_id in (select app.company_ids_for(auth.uid()))
          or (q.buyer_company_id in (select app.company_ids_for(auth.uid())) and q.status <> 'draft')
          or app.is_platform_admin()
        )
    )
  );

create policy quotation_lines_supplier_write on public.quotation_lines
  for all to authenticated
  using (
    exists (
      select 1 from public.quotations q
      where q.id = quotation_lines.quotation_id
        and app.is_member_of(q.supplier_company_id)
    )
  )
  with check (
    exists (
      select 1 from public.quotations q
      where q.id = quotation_lines.quotation_id
        and app.is_member_of(q.supplier_company_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Orders and events
-- Orders are created server side from an accepted quotation, so there is no
-- insert policy for authenticated. Use the service role in a route handler.
-- ---------------------------------------------------------------------------

create policy orders_party_read on public.orders
  for select to authenticated
  using (
    buyer_company_id in (select app.company_ids_for(auth.uid()))
    or supplier_company_id in (select app.company_ids_for(auth.uid()))
    or app.is_platform_admin()
  );

create policy orders_party_update on public.orders
  for update to authenticated
  using (
    buyer_company_id in (select app.company_ids_for(auth.uid()))
    or supplier_company_id in (select app.company_ids_for(auth.uid()))
    or app.is_platform_admin()
  )
  with check (
    buyer_company_id in (select app.company_ids_for(auth.uid()))
    or supplier_company_id in (select app.company_ids_for(auth.uid()))
    or app.is_platform_admin()
  );

create policy order_events_party_read on public.order_events
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_events.order_id
        and (
          o.buyer_company_id in (select app.company_ids_for(auth.uid()))
          or o.supplier_company_id in (select app.company_ids_for(auth.uid()))
          or app.is_platform_admin()
        )
    )
  );

create policy order_events_party_insert on public.order_events
  for insert to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_events.order_id
        and (
          app.is_member_of(o.buyer_company_id)
          or app.is_member_of(o.supplier_company_id)
          or app.is_platform_admin()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Messaging
-- ---------------------------------------------------------------------------

create policy message_threads_party_all on public.message_threads
  for all to authenticated
  using (
    buyer_company_id in (select app.company_ids_for(auth.uid()))
    or supplier_company_id in (select app.company_ids_for(auth.uid()))
    or app.is_platform_admin()
  )
  with check (
    app.is_member_of(buyer_company_id)
    or app.is_member_of(supplier_company_id)
    or app.is_platform_admin()
  );

create policy messages_party_read on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.message_threads t
      where t.id = messages.thread_id
        and (
          t.buyer_company_id in (select app.company_ids_for(auth.uid()))
          or t.supplier_company_id in (select app.company_ids_for(auth.uid()))
          or app.is_platform_admin()
        )
    )
  );

create policy messages_party_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and app.is_member_of(sender_company_id)
    and exists (
      select 1 from public.message_threads t
      where t.id = messages.thread_id
        and t.is_closed = false
        and sender_company_id in (t.buyer_company_id, t.supplier_company_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create policy notifications_own_read on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy notifications_own_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Audit log
-- RLS is enabled and there are no policies. That is not an omission. Only the
-- service role writes here and only the service role reads it.
-- ---------------------------------------------------------------------------

revoke all on public.audit_log from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Leads
-- Anyone may submit one. Nobody may read them back. Rate limiting and captcha
-- belong in the route handler, not in a policy.
-- ---------------------------------------------------------------------------

revoke select on public.leads from anon, authenticated;

create policy leads_public_insert on public.leads
  for insert to anon, authenticated
  with check (true);

create policy leads_admin_read on public.leads
  for select to authenticated
  using (app.is_platform_admin());

create policy leads_admin_write on public.leads
  for all to authenticated
  using (app.is_platform_admin())
  with check (app.is_platform_admin());
