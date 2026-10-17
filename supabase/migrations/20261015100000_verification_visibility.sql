begin;

-- Helpers: write the audit log and notify people. Not callable from the browser.
create or replace function app.write_audit(
  p_action text, p_entity_type text, p_entity_id uuid, p_before jsonb, p_after jsonb)
returns void language plpgsql security definer
set search_path to 'public', 'app' as $function$
begin
  insert into public.audit_log (actor_id, actor_email, action, entity_type, entity_id, before_state, after_state)
  values (auth.uid(), (select email from public.profiles where id = auth.uid()),
          p_action, p_entity_type, p_entity_id, p_before, p_after);
end; $function$;

create or replace function app.notify_admins(
  p_kind text, p_title text, p_body text, p_link text, p_company uuid)
returns void language plpgsql security definer
set search_path to 'public', 'app' as $function$
begin
  insert into public.notifications (user_id, company_id, kind, title, body, link_path, metadata)
  select p.id, p_company, p_kind, p_title, p_body, p_link, '{}'::jsonb
  from public.profiles p where p.platform_role = 'admin';
end; $function$;

create or replace function app.notify_company(
  p_company uuid, p_kind text, p_title text, p_body text, p_link text)
returns void language plpgsql security definer
set search_path to 'public', 'app' as $function$
begin
  insert into public.notifications (user_id, company_id, kind, title, body, link_path, metadata)
  select m.user_id, p_company, p_kind, p_title, p_body, p_link, '{}'::jsonb
  from public.company_members m
  where m.company_id = p_company and m.status = 'active'
    and m.member_role in ('owner', 'admin');
end; $function$;

revoke all on function app.write_audit(text, text, uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function app.notify_admins(text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function app.notify_company(uuid, text, text, text, text) from public, anon, authenticated;

-- The guard now lets exactly one thing through: submit_company_for_verification
-- moving a company from unverified/rejected to pending.
create or replace function app.guard_company_verification()
returns trigger language plpgsql as $function$
declare
  v_submitting boolean;
begin
  if app.is_service_context() then
    return new;
  end if;

  v_submitting := current_setting('app.submitting_company', true) = new.id::text
                  and new.verification_status = 'pending'
                  and old.verification_status in ('unverified', 'rejected');

  if not app.is_platform_admin(auth.uid()) then
    if (new.verification_status is distinct from old.verification_status and not v_submitting)
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
end; $function$;

-- Submit: sets pending, writes the audit log, notifies admins and the company.
create or replace function public.submit_company_for_verification(p_company_id uuid)
returns void language plpgsql security definer
set search_path to 'public', 'app' as $function$
declare
  v_status app.verification_status;
  v_name   text;
  v_docs   integer;
begin
  if not app.is_company_admin(p_company_id) then
    raise exception 'You do not manage this company.' using errcode = '42501';
  end if;

  select verification_status, legal_name into v_status, v_name
  from public.companies where id = p_company_id;

  if v_status is null then
    raise exception 'No such company.' using errcode = 'P0002';
  end if;
  if v_status not in ('unverified', 'rejected') then
    raise exception 'This company is already %.', v_status using errcode = '22023';
  end if;

  select count(*) into v_docs from public.certifications where company_id = p_company_id;
  if v_docs = 0 then
    raise exception 'Upload at least one document before submitting.' using errcode = '22023';
  end if;

  perform set_config('app.submitting_company', p_company_id::text, true);
  update public.companies
     set verification_status = 'pending', verification_notes = null
   where id = p_company_id;
  perform set_config('app.submitting_company', '', true);

  -- documents resubmitted after a rejection go back to the review queue
  update public.certifications set status = 'pending'
   where company_id = p_company_id and status = 'rejected';

  perform app.write_audit('company.submitted', 'company', p_company_id,
    jsonb_build_object('verification_status', v_status),
    jsonb_build_object('verification_status', 'pending', 'documents', v_docs));
  perform app.notify_admins('verification_submitted', 'New company awaiting verification',
    v_name || ' submitted ' || v_docs || ' document(s) for review.',
    '/admin/companies/' || p_company_id, p_company_id);
  perform app.notify_company(p_company_id, 'verification_received', 'We have your documents',
    'Our team will review them and you will see the result here.', '/account/documents');
end; $function$;

-- Decide: same rules as before, plus audit and a notification to the company.
create or replace function public.admin_decide_company(p_company_id uuid, p_status text, p_notes text)
returns void language plpgsql security definer
set search_path to 'public', 'app' as $function$
declare
  v_admin uuid := auth.uid();
  v_note  text := nullif(btrim(coalesce(p_notes, '')), '');
  v_old   app.verification_status;
  v_name  text;
begin
  if not app.is_platform_admin() then
    raise exception 'Not permitted.' using errcode = '42501';
  end if;
  if p_status not in ('verified', 'rejected', 'suspended') then
    raise exception 'Unknown decision: %', p_status using errcode = '22023';
  end if;
  if p_status <> 'verified' and v_note is null then
    raise exception 'A reason is required when not approving.' using errcode = '22023';
  end if;

  select verification_status, legal_name into v_old, v_name
  from public.companies where id = p_company_id;
  if v_name is null then
    raise exception 'No such company.' using errcode = 'P0002';
  end if;

  update public.companies
     set verification_status = p_status::app.verification_status,
         verification_notes  = v_note,
         verified_at         = now(),
         verified_by         = v_admin,
         is_listed           = (p_status = 'verified')
   where id = p_company_id;

  update public.certifications
     set status = (case when p_status = 'verified' then 'verified' else 'rejected' end)::app.certification_status,
         reviewed_at = now(), reviewed_by = v_admin
   where company_id = p_company_id and status = 'pending';

  perform app.write_audit('company.' || p_status, 'company', p_company_id,
    jsonb_build_object('verification_status', v_old),
    jsonb_build_object('verification_status', p_status, 'notes', v_note));
  perform app.notify_company(p_company_id, 'verification_' || p_status,
    case p_status when 'verified'  then 'Your company is verified'
                  when 'rejected'  then 'Changes needed before we can verify you'
                  else 'Your company has been suspended' end,
    coalesce(v_note, 'Your company is now visible in the directory and your listings can go live.'),
    '/account');
end; $function$;

-- Admin sees every company at every stage, with a clear state.
create or replace view public.admin_company_queue with (security_invoker = true) as
select c.id, c.legal_name, c.trading_name, c.company_type, c.country_code,
       c.verification_status, c.is_listed, c.created_at, c.updated_at,
       d.documents_total, d.documents_pending, d.last_document_at,
       case
         when c.verification_status = 'unverified' and d.documents_total > 0 then 'documents_not_submitted'
         when c.verification_status = 'unverified' then 'no_documents'
         else c.verification_status::text
       end as queue_state
from public.companies c
left join lateral (
  select count(*)::int as documents_total,
         count(*) filter (where x.status = 'pending')::int as documents_pending,
         max(x.created_at) as last_document_at
  from public.certifications x where x.company_id = c.id
) d on true;

grant select on public.admin_company_queue to authenticated;

-- Admins can read the audit log (it had no read policy at all).
grant select on public.audit_log to authenticated;
drop policy if exists audit_log_admin_read on public.audit_log;
create policy audit_log_admin_read on public.audit_log
  for select to authenticated using (app.is_platform_admin());

commit;