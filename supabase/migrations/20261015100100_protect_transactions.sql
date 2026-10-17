begin;

create or replace function app.guard_enquiry_parties()
returns trigger language plpgsql as $function$
begin
  if app.is_service_context() or app.is_platform_admin(auth.uid()) then
    return new;
  end if;
  if new.buyer_company_id    is distinct from old.buyer_company_id
     or new.supplier_company_id is distinct from old.supplier_company_id
     or new.product_id          is distinct from old.product_id
     or new.category_id         is distinct from old.category_id
     or new.quantity            is distinct from old.quantity
     or new.created_by          is distinct from old.created_by
     or new.reference           is distinct from old.reference
  then
    raise exception 'An enquiry''s parties and request cannot be changed.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end; $function$;

create or replace function app.guard_order_terms()
returns trigger language plpgsql as $function$
begin
  if app.is_service_context() or app.is_platform_admin(auth.uid()) then
    return new;
  end if;
  if new.total_minor         is distinct from old.total_minor
     or new.commission_rate    is distinct from old.commission_rate
     or new.commission_minor   is distinct from old.commission_minor
     or new.currency           is distinct from old.currency
     or new.buyer_company_id   is distinct from old.buyer_company_id
     or new.supplier_company_id is distinct from old.supplier_company_id
     or new.quotation_id       is distinct from old.quotation_id
     or new.enquiry_id         is distinct from old.enquiry_id
     or new.reference          is distinct from old.reference
     or new.created_by         is distinct from old.created_by
  then
    raise exception 'The agreed terms of an order cannot be changed.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end; $function$;

drop trigger if exists enquiries_guard_parties on public.enquiries;
create trigger enquiries_guard_parties before update on public.enquiries
  for each row execute function app.guard_enquiry_parties();

drop trigger if exists orders_guard_terms on public.orders;
create trigger orders_guard_terms before update on public.orders
  for each row execute function app.guard_order_terms();

commit;