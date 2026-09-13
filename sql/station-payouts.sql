-- Additive station functions. Uses the existing organization and payout ledger.
-- Service-role only, SECURITY INVOKER: caller routes must validate identity.
create or replace function public.station_collection_balance(target_campaign uuid)
returns table(gross_sales numeric, earned numeric, available numeric, pending numeric, paid numeric, has_open_request boolean)
language sql security invoker set search_path = public as $$
  with earnings as (
    select coalesce(sum(i.quantity*i.unit_price-coalesce(i.refunded_merchandise_amount,0)),0) gross,
      coalesce(sum(i.contribution_amount-coalesce(i.refunded_contribution_amount,0)),0) earned
    from order_items i join campaign_products cp on cp.id=i.campaign_product_id
    join orders o on o.id=i.order_id
    where cp.campaign_id=target_campaign and o.status <> 'cancelled'
  ), committed as (
    select coalesce(sum(p.payout_amount) filter(where p.status <> 'cancelled'),0) total,
      coalesce(sum(p.payout_amount) filter(where p.status not in ('paid','cancelled')),0) pending,
      coalesce(sum(p.payout_amount) filter(where p.status='paid'),0) paid
    from payouts p where p.campaign_id=target_campaign
  ) select e.gross,e.earned,greatest(0,e.earned-c.total),c.pending,c.paid,
    exists(select 1 from payout_requests r where r.campaign_id=target_campaign and r.status in ('requested','approved','processing'))
  from earnings e cross join committed c;
$$;
revoke all on function public.station_collection_balance(uuid) from public,anon,authenticated;
grant execute on function public.station_collection_balance(uuid) to service_role;

create or replace function public.request_station_payout(target_campaign uuid, actor uuid)
returns uuid language plpgsql security invoker set search_path=public as $$
declare org uuid; result uuid; generated record;
begin
  perform pg_advisory_xact_lock(hashtext(target_campaign::text));
  select c.organization_id into org from campaigns c join organizations o on o.id=c.organization_id
  where c.id=target_campaign and o.organization_type='detroit_fire_station' and o.is_active;
  if org is null then raise exception 'Station collection not found'; end if;
  if not exists(select 1 from platform_admins where user_id=actor and is_active)
    and not exists(select 1 from organization_members where user_id=actor and organization_id=org and role in ('owner','admin'))
  then raise exception 'Station manager access required'; end if;
  if exists(select 1 from payout_requests where campaign_id=target_campaign and status in ('requested','approved','processing'))
  then raise exception 'A request is already pending'; end if;
  select * into generated from generate_campaign_payout(target_campaign);
  if generated.payout_id is null or generated.payout_amount < 100 then
    raise exception 'At least $100 in available collection earnings is required';
  end if;
  -- Generation and reservation are in the same transaction; errors roll both back.
  insert into payout_requests(organization_id,campaign_id,requested_by,requested_amount,status,payout_id)
  values(org,target_campaign,actor,generated.payout_amount,'requested',generated.payout_id) returning id into result;
  return result;
end;
$$;
revoke all on function public.request_station_payout(uuid,uuid) from public,anon,authenticated;
grant execute on function public.request_station_payout(uuid,uuid) to service_role;

create or replace function public.review_station_payout(target_request uuid, actor uuid, action text, note text, reference text)
returns void language plpgsql security invoker set search_path=public as $$
declare r payout_requests%rowtype;
begin
  if not exists(select 1 from platform_admins where user_id=actor and is_active) then raise exception 'Platform administrator required'; end if;
  select * into r from payout_requests where id=target_request for update;
  if r.id is null or not exists(select 1 from organizations where id=r.organization_id and organization_type='detroit_fire_station')
  then raise exception 'Station request not found'; end if;
  if r.payout_id is null then raise exception 'Request has no reserved payout'; end if;
  if action='approve' and r.status='requested' and r.requested_amount>=100 then
    update payout_requests set status='approved',reviewed_by=actor,reviewed_at=now(),admin_note=note where id=r.id;
  elsif action='reject' and r.status='requested' then
    update payouts set status='cancelled' where id=r.payout_id;
    update payout_requests set status='rejected',reviewed_by=actor,reviewed_at=now(),admin_note=note where id=r.id;
  elsif action='processing' and r.status='approved' then
    update payouts set status='processing' where id=r.payout_id;
    update payout_requests set status='processing',admin_note=note where id=r.id;
  elsif action='paid' and r.status in ('approved','processing') then
    if coalesce(trim(reference),'')='' then raise exception 'Payment reference is required'; end if;
    update payouts set status='paid',paid_at=now(),payment_reference=reference where id=r.payout_id;
    update payout_requests set status='paid',paid_at=now(),admin_note=note where id=r.id;
  else raise exception 'Invalid payout transition'; end if;
end;
$$;
revoke all on function public.review_station_payout(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.review_station_payout(uuid,uuid,text,text,text) to service_role;
