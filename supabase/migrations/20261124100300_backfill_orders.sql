-- ===========================================================================
-- AfriLynq / Stage 4 / 05  Orders for quotations accepted before Stage 4
--
-- Quotations have been acceptable since Stage 3. Orders only started being
-- created when a quotation is accepted today, 24 November. So every
-- quotation accepted before today is agreed, binding, and has no order
-- behind it: the buyer has nothing to pay against and the supplier has
-- nothing to ship against.
--
-- QUO-26-01007 is one of them, accepted 17 November.
--
-- This creates the missing orders, with the same arithmetic the application
-- uses: 7 percent of the total, fixed at the moment of the order rather
-- than read live later.
--
-- It will not touch a quotation that already has an order, so it is safe to
-- run twice and safe to run again if more turn up.
--
-- Run this AFTER 02, 03 and 04.
-- ===========================================================================

begin;

with missing as (
  select
    q.id              as quotation_id,
    q.enquiry_id,
    q.supplier_company_id,
    -- A shopper has no company, so the buyer comes from the enquiry, which
    -- stage3-06 taught to carry either shape. Belt and braces: fall back to
    -- the quotation's own buyer company if the enquiry has one.
    coalesce(q.buyer_company_id, e.buyer_company_id)  as buyer_company_id,
    case
      when coalesce(q.buyer_company_id, e.buyer_company_id) is null
      then coalesce(e.buyer_profile_id, q.created_by)
    end                                               as buyer_profile_id,
    q.currency,
    q.total_minor,
    q.incoterm,
    e.delivery_country_code,
    e.delivery_city,
    q.created_by,
    q.responded_at
  from public.quotations q
  join public.enquiries e on e.id = q.enquiry_id
  where q.status = 'accepted'
    and not exists (select 1 from public.orders o where o.quotation_id = q.id)
)
insert into public.orders (
  quotation_id, enquiry_id, buyer_company_id, buyer_profile_id,
  supplier_company_id, status, currency, total_minor,
  commission_rate, commission_minor,
  incoterm, delivery_country_code, delivery_address,
  created_by, created_at
)
select
  m.quotation_id,
  m.enquiry_id,
  m.buyer_company_id,
  m.buyer_profile_id,
  m.supplier_company_id,
  'awaiting_payment',
  m.currency,
  m.total_minor,
  7.00,
  round(m.total_minor * 7.00 / 100),
  m.incoterm,
  m.delivery_country_code,
  m.delivery_city,
  m.created_by,
  -- Dated when the quotation was accepted, not now. An order that claims to
  -- have been raised today when the deal was struck a week ago is a lie
  -- that will confuse somebody reading the timeline later.
  coalesce(m.responded_at, now())
from missing m
-- The one-buyer rule would reject a row with neither. Skip it rather than
-- fail the whole backfill, and let the report below show it was skipped.
where num_nonnulls(m.buyer_company_id, m.buyer_profile_id) = 1;

-- ---------------------------------------------------------------------------
-- What happened
--
-- accepted_quotations should equal orders_now. If anything sits in
-- still_missing, those quotations have neither a buyer company nor a buyer
-- profile on the enquiry, which should be impossible and wants looking at.
-- ---------------------------------------------------------------------------

select
  (select count(*) from public.quotations where status = 'accepted') as accepted_quotations,
  (select count(*) from public.orders o
     join public.quotations q on q.id = o.quotation_id
    where q.status = 'accepted') as orders_now,
  (select count(*) from public.quotations q
    where q.status = 'accepted'
      and not exists (select 1 from public.orders o where o.quotation_id = q.id)) as still_missing;

commit;
