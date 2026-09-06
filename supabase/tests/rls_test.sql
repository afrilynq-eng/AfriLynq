-- AfriLynq platform
-- Row level security test suite
--
-- Run against a local database only. It creates fixtures, asserts, and rolls
-- everything back, so it leaves no data behind.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
--
-- Every assertion here corresponds to a promise made to the client: a supplier
-- cannot see another supplier's enquiries, a company cannot verify itself, a
-- sent quotation cannot be quietly rewritten. If one of these starts failing,
-- something in a later migration has opened a hole.

begin;

set local role none;

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'seller1@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'seller2@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'buyer@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'admin@example.com');

update public.profiles set platform_role = 'admin'
  where id = '44444444-4444-4444-4444-444444444444';

insert into public.companies (id, slug, legal_name, company_type, country_code, verification_status, is_listed, created_by) values
  ('aaaaaaaa-0000-0000-0000-000000000001','test-green','Green Farms Ltd','supplier','NG','verified',true,'11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-0000-0000-0000-000000000002','test-rival','Rival Farms Ltd','supplier','GH','verified',true,'22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-0000-0000-0000-000000000003','test-hidden','Hidden Co Ltd','supplier','KE','pending',false,'22222222-2222-2222-2222-222222222222'),
  ('bbbbbbbb-0000-0000-0000-000000000001','test-buyer','UK Buyer Ltd','buyer','GB','verified',true,'33333333-3333-3333-3333-333333333333');

insert into public.company_members (company_id, user_id, member_role, status, joined_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','owner','active',now()),
  ('aaaaaaaa-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','owner','active',now()),
  ('aaaaaaaa-0000-0000-0000-000000000003','22222222-2222-2222-2222-222222222222','owner','active',now()),
  ('bbbbbbbb-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','owner','active',now());

insert into public.products (id, company_id, category_id, slug, name, status, unit_code, price_currency, price_min_minor)
select 'cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001', c.id,
       'test-hibiscus','Dried Hibiscus Flowers','active','kg','GBP',180
from public.categories c where c.slug = 'spices-and-botanicals';

insert into public.enquiries (id, buyer_company_id, supplier_company_id, product_id, quantity, unit_code, created_by)
values ('dddddddd-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001',
        5000,'kg','33333333-3333-3333-3333-333333333333');

insert into public.quotations (id, enquiry_id, supplier_company_id, buyer_company_id, currency,
                               subtotal_minor, total_minor, status, created_by)
values ('eeeeeeee-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
        'GBP', 900000, 900000, 'sent', '11111111-1111-1111-1111-111111111111');

-- ---------------------------------------------------------------------------
-- Assertion helpers
-- ---------------------------------------------------------------------------

create or replace function pg_temp.expect(label text, condition boolean)
returns void language plpgsql as $$
begin
  if condition then
    raise notice 'PASS  %', label;
  else
    raise exception 'FAIL  %', label;
  end if;
end;
$$;

create or replace function pg_temp.act_as(uid uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
  execute 'set local role ' || case when uid is null then 'anon' else 'authenticated' end;
end;
$$;

-- Runs a statement and reports whether it was rejected.
create or replace function pg_temp.rejected(stmt text)
returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Visibility to the public internet
-- ---------------------------------------------------------------------------

select pg_temp.act_as(null);

select pg_temp.expect('anon sees only verified and listed companies',
  (select count(*) from public.companies) = 3);

select pg_temp.expect('anon sees the active product of a listed supplier',
  (select count(*) from public.products) = 1);

select pg_temp.expect('anon sees no enquiries',
  (select count(*) from public.enquiries) = 0);

select pg_temp.expect('anon sees no quotations',
  (select count(*) from public.quotations) = 0);

select pg_temp.expect('anon cannot read the profiles table',
  pg_temp.rejected('select count(*) from public.profiles'));

select pg_temp.expect('anon cannot read a certificate file path',
  pg_temp.rejected('select document_path from public.certifications'));

select pg_temp.expect('anon may submit a lead',
  not pg_temp.rejected($x$insert into public.leads (lead_type, full_name, email)
                          values ('supplier','Test Lead','lead@example.com')$x$));

select pg_temp.expect('anon cannot read leads back',
  pg_temp.rejected('select count(*) from public.leads'));

-- ---------------------------------------------------------------------------
-- Isolation between competing suppliers
-- This is the single most important group in this file.
-- ---------------------------------------------------------------------------

select pg_temp.act_as('22222222-2222-2222-2222-222222222222');

select pg_temp.expect('a rival supplier sees none of another supplier''s enquiries',
  (select count(*) from public.enquiries) = 0);

select pg_temp.expect('a rival supplier sees none of another supplier''s quotations',
  (select count(*) from public.quotations) = 0);

select pg_temp.expect('a rival cannot add himself to a company he does not run',
  pg_temp.rejected($x$insert into public.company_members (company_id, user_id)
                      values ('aaaaaaaa-0000-0000-0000-000000000001',
                              '22222222-2222-2222-2222-222222222222')$x$));

select pg_temp.expect('a company cannot mark itself verified',
  pg_temp.rejected($x$update public.companies
                      set verification_status = 'verified', is_listed = true
                      where id = 'aaaaaaaa-0000-0000-0000-000000000003'$x$));

-- ---------------------------------------------------------------------------
-- The two parties to a transaction
-- ---------------------------------------------------------------------------

select pg_temp.act_as('11111111-1111-1111-1111-111111111111');

select pg_temp.expect('the addressed supplier sees the enquiry',
  (select count(*) from public.enquiries) = 1);

select pg_temp.expect('a user cannot promote himself to platform admin',
  pg_temp.rejected($x$update public.profiles set platform_role = 'admin'
                      where id = '11111111-1111-1111-1111-111111111111'$x$));

select pg_temp.expect('a sent quotation cannot have its total rewritten',
  pg_temp.rejected($x$update public.quotations set total_minor = 1
                      where id = 'eeeeeeee-0000-0000-0000-000000000001'$x$));

select pg_temp.act_as('33333333-3333-3333-3333-333333333333');

select pg_temp.expect('the buyer sees its own enquiry',
  (select count(*) from public.enquiries) = 1);

select pg_temp.expect('the buyer sees the sent quotation',
  (select count(*) from public.quotations) = 1);

select pg_temp.expect('the buyer sees only its own profile',
  (select count(*) from public.profiles) = 1);

select pg_temp.expect('the buyer may accept a sent quotation',
  not pg_temp.rejected($x$update public.quotations
                          set status = 'accepted', responded_at = now()
                          where id = 'eeeeeeee-0000-0000-0000-000000000001'$x$));

select pg_temp.expect('a buyer cannot enquire to a company that is not listed',
  pg_temp.rejected($x$insert into public.enquiries
      (buyer_company_id, supplier_company_id, quantity, unit_code, created_by)
      values ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000003',
              10,'kg','33333333-3333-3333-3333-333333333333')$x$));

-- ---------------------------------------------------------------------------
-- Platform administration
-- ---------------------------------------------------------------------------

select pg_temp.act_as('44444444-4444-4444-4444-444444444444');

select pg_temp.expect('a platform admin may verify a company',
  not pg_temp.rejected($x$update public.companies
                          set verification_status = 'verified', is_listed = true
                          where id = 'aaaaaaaa-0000-0000-0000-000000000003'$x$));

select pg_temp.expect('the audit log is not reachable by any user role',
  pg_temp.rejected('select count(*) from public.audit_log'));

-- Regression. Revoking select on leads from authenticated as well as anon made
-- the admin read policy unreachable, and the admin screen showed "permission
-- denied for table leads". The negative assertion below was not enough on its
-- own: a positive one has to sit beside it.
select pg_temp.expect('a platform admin can read leads',
  not pg_temp.rejected('select count(*) from public.leads'));

-- ---------------------------------------------------------------------------
-- Integrity rules that hold regardless of who is asking
-- ---------------------------------------------------------------------------

set local role none;
select set_config('request.jwt.claim.sub', '', true);

select pg_temp.expect('a message cannot be deleted',
  pg_temp.rejected($x$
    insert into public.message_threads (id, enquiry_id, buyer_company_id, supplier_company_id)
      values ('ffffffff-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000001',
              'bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001');
    insert into public.messages (thread_id, sender_id, sender_company_id, body)
      values ('ffffffff-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333',
              'bbbbbbbb-0000-0000-0000-000000000001','hello');
    delete from public.messages
      where thread_id = 'ffffffff-0000-0000-0000-000000000001';
  $x$));

select pg_temp.expect('a company cannot be left without an owner',
  pg_temp.rejected($x$delete from public.company_members
                      where company_id = 'aaaaaaaa-0000-0000-0000-000000000001'$x$));

savepoint before_order;
insert into public.orders (id, quotation_id, enquiry_id, buyer_company_id, supplier_company_id,
                           currency, total_minor, created_by)
values ('99999999-0000-0000-0000-000000000001','eeeeeeee-0000-0000-0000-000000000001',
        'dddddddd-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000001','GBP',900000,
        '33333333-3333-3333-3333-333333333333');

update public.orders set status = 'in_production'
  where id = '99999999-0000-0000-0000-000000000001';

select pg_temp.expect('an order status change writes an event automatically',
  (select count(*) from public.order_events
    where order_id = '99999999-0000-0000-0000-000000000001') = 1);

select pg_temp.expect('order events cannot be rewritten',
  pg_temp.rejected($x$update public.order_events set note = 'tampered'
                      where order_id = '99999999-0000-0000-0000-000000000001'$x$));

rollback to savepoint before_order;

insert into public.quotations (id, enquiry_id, version, supersedes_id, supplier_company_id,
                               buyer_company_id, currency, created_by)
values ('77777777-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000001', 2,
        'eeeeeeee-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001','GBP','11111111-1111-1111-1111-111111111111');

insert into public.quotation_lines (quotation_id, description, quantity, unit_code, unit_price_minor)
values ('77777777-0000-0000-0000-000000000001','Dried hibiscus', 5000, 'kg', 180);

select pg_temp.expect('a line total is computed by the database, not sent by the client',
  (select line_total_minor from public.quotation_lines
    where quotation_id = '77777777-0000-0000-0000-000000000001') = 900000);

select pg_temp.expect('a revision is a new version, not an edit',
  (select count(*) from public.quotations
    where enquiry_id = 'dddddddd-0000-0000-0000-000000000001') = 2);

select pg_temp.expect('two quotations cannot share a version on one enquiry',
  pg_temp.rejected($x$insert into public.quotations
      (enquiry_id, version, supplier_company_id, buyer_company_id, currency, created_by)
      values ('dddddddd-0000-0000-0000-000000000001', 2,
              'aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
              'GBP','11111111-1111-1111-1111-111111111111')$x$));

select pg_temp.expect('a company cannot send an enquiry to itself',
  pg_temp.rejected($x$insert into public.enquiries
      (buyer_company_id, supplier_company_id, quantity, unit_code, created_by)
      values ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
              10,'kg','11111111-1111-1111-1111-111111111111')$x$));

select 'All row level security checks passed.' as result;

rollback;
