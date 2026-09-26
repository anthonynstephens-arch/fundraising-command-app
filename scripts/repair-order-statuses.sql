-- Repair only imported orders from their latest received Shopify order snapshot.
-- No line items, contribution amounts, payout rows, or campaign assignments change.
with latest as (
 select distinct on (payload->>'id') payload
 from public.webhook_events
 where provider='shopify' and event_type in ('orders/create','orders/updated','orders/cancelled')
 order by payload->>'id', (payload->>'updated_at')::timestamptz desc nulls last, created_at desc
), mapped as (
 select o.id,
 case when l.payload->>'cancelled_at' is not null then 'cancelled'
      when l.payload->>'financial_status' in ('paid','refunded','partially_refunded') then l.payload->>'financial_status'
      else o.status::text end::public.order_status as payment,
 case when l.payload->>'cancelled_at' is not null then 'cancelled'
      when l.payload->>'fulfillment_status'='fulfilled' then
        case when f.n>0 and f.delivered=f.n then 'delivered'
             when f.delivered>0 then 'partially_delivered'
             when f.states ? 'failure' then 'failure'
             when f.states ? 'attempted_delivery' then 'attempted_delivery'
             when f.states ? 'delayed' then 'delayed'
             when f.states ? 'out_for_delivery' then 'out_for_delivery'
             when f.states ? 'in_transit' then 'in_transit'
             when f.states ? 'label_printed' then 'label_printed'
             when f.states ? 'label_purchased' then 'label_purchased'
             else 'fulfilled' end
      else coalesce(l.payload->>'fulfillment_status','unfulfilled') end as fulfillment
 from public.orders o join latest l on l.payload->>'id'=o.shopify_order_id
 cross join lateral (
  select count(*) n,count(*) filter(where value->>'shipment_status'='delivered') delivered,
    coalesce(jsonb_agg(value->>'shipment_status'),'[]') states
  from jsonb_array_elements(coalesce(l.payload->'fulfillments','[]'))
  where coalesce(value->>'status','') not in ('cancelled','canceled','failure','error')
 ) f
), repaired as (
 update public.orders o set status=m.payment,fulfillment_status=m.fulfillment
 from mapped m where o.id=m.id and (o.status is distinct from m.payment or o.fulfillment_status is distinct from m.fulfillment)
 returning o.fulfillment_status
)
select fulfillment_status,count(*) as repaired from repaired group by fulfillment_status;
