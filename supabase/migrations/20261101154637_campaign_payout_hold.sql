-- Eligibility begins 35 days after campaign end. Existing payout history is preserved.
CREATE OR REPLACE FUNCTION public.generate_campaign_payout(target_campaign uuid)
 RETURNS TABLE(payout_id uuid, gross_sales numeric, contribution_amount numeric, refunded_contribution numeric, payout_amount numeric, item_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_campaign public.campaigns%rowtype;
  v_payout_id uuid;
  v_gross numeric := 0;
  v_contribution numeric := 0;
  v_refunded numeric := 0;
  v_payout numeric := 0;
  v_count integer := 0;
  v_start date;
  v_end date;
begin
  perform pg_advisory_xact_lock(hashtext(target_campaign::text));

  select c.* into v_campaign
  from public.campaigns c
  where c.id = target_campaign;

  if not found then
    raise exception 'Campaign not found';
  end if;

  -- Designer commission programs are ongoing, not timed fundraising campaigns.
  if v_campaign.campaign_type is distinct from 'designer' and
     (v_campaign.ends_at is null or now() < v_campaign.ends_at + interval '35 days') then
    return;
  end if;
  perform 1 from public.organizations where id=v_campaign.organization_id for share;

  with accounted as (
    select
      oi.id as order_item_id,
      oi.order_id,
      oi.quantity,
      oi.unit_price,
      oi.contribution_amount,
      oi.refunded_contribution_amount,
      o.placed_at,
      coalesce(sum(case when p.status <> 'cancelled' then pi.contribution_amount else 0 end),0) as prior_contribution,
      coalesce(sum(case when p.status <> 'cancelled' then greatest(-pi.adjustment_amount,0) else 0 end),0) as prior_refund
    from public.order_items oi
    join public.campaign_products cp on cp.id = oi.campaign_product_id
    join public.orders o on o.id = oi.order_id
    left join public.payout_items pi on pi.order_item_id = oi.id
    left join public.payouts p on p.id = pi.payout_id
    where cp.campaign_id = target_campaign
      and (v_campaign.campaign_type='designer' or o.status in ('paid','partially_refunded','refunded'))
      and public.order_in_department_period(v_campaign.organization_id, o.placed_at)
    group by oi.id, oi.order_id, oi.quantity, oi.unit_price, oi.contribution_amount,
             oi.refunded_contribution_amount, o.placed_at
  ),
  eligible as (
    select
      a.*,
      case when a.prior_contribution = 0 then a.contribution_amount else 0 end as new_contribution,
      greatest(a.refunded_contribution_amount - a.prior_refund, 0) as new_refund,
      case when a.prior_contribution = 0 then a.unit_price * a.quantity else 0 end as new_gross
    from accounted a
  )
  select
    coalesce(sum(e.new_gross),0),
    coalesce(sum(e.new_contribution),0),
    coalesce(sum(e.new_refund),0),
    coalesce(sum(e.new_contribution - e.new_refund),0),
    count(*) filter (where e.new_contribution <> 0 or e.new_refund <> 0)::integer,
    min(e.placed_at) filter (where e.new_contribution <> 0 or e.new_refund <> 0)::date,
    max(e.placed_at) filter (where e.new_contribution <> 0 or e.new_refund <> 0)::date
  into v_gross, v_contribution, v_refunded, v_payout, v_count, v_start, v_end
  from eligible e;

  if v_count = 0 then
    return;
  end if;

  insert into public.payouts (
    organization_id,
    campaign_id,
    status,
    period_start,
    period_end,
    gross_sales,
    contribution_amount,
    adjustment_amount,
    notes
  ) values (
    v_campaign.organization_id,
    v_campaign.id,
    'pending',
    v_start,
    coalesce(v_end, current_date),
    v_gross,
    v_contribution,
    -v_refunded,
    case
      when v_contribution = 0 and v_refunded > 0 then 'Refund adjustment generated after prior payout attribution'
      when v_refunded > 0 then 'Generated from unpaid campaign items with refund adjustments'
      else 'Generated from unpaid campaign order items'
    end
  )
  returning payouts.id into v_payout_id;

  with accounted as (
    select
      oi.id as order_item_id,
      oi.order_id,
      oi.contribution_amount,
      oi.refunded_contribution_amount,
      coalesce(sum(case when p.status <> 'cancelled' then pi.contribution_amount else 0 end),0) as prior_contribution,
      coalesce(sum(case when p.status <> 'cancelled' then greatest(-pi.adjustment_amount,0) else 0 end),0) as prior_refund
    from public.order_items oi
    join public.campaign_products cp on cp.id = oi.campaign_product_id
    join public.orders o on o.id = oi.order_id
    left join public.payout_items pi on pi.order_item_id = oi.id
    left join public.payouts p on p.id = pi.payout_id
    where cp.campaign_id = target_campaign
      and (v_campaign.campaign_type='designer' or o.status in ('paid','partially_refunded','refunded'))
      and public.order_in_department_period(v_campaign.organization_id, o.placed_at)
    group by oi.id, oi.order_id, oi.contribution_amount, oi.refunded_contribution_amount
  )
  insert into public.payout_items (
    payout_id,
    order_id,
    order_item_id,
    contribution_amount,
    adjustment_amount
  )
  select
    v_payout_id,
    a.order_id,
    a.order_item_id,
    case when a.prior_contribution = 0 then a.contribution_amount else 0 end,
    -greatest(a.refunded_contribution_amount - a.prior_refund, 0)
  from accounted a
  where
    (case when a.prior_contribution = 0 then a.contribution_amount else 0 end) <> 0
    or greatest(a.refunded_contribution_amount - a.prior_refund, 0) <> 0;

  return query
  select
    v_payout_id,
    v_gross,
    v_contribution,
    v_refunded,
    v_payout,
    v_count;
end;
$function$;

create or replace function public.station_collection_balance(target_campaign uuid)
returns table(gross_sales numeric, earned numeric, available numeric, pending numeric, paid numeric, has_open_request boolean)
language sql security invoker set search_path=public as $$
  with eligible as (
    select i.*, o.status as order_status, c.campaign_type from order_items i
    join campaign_products cp on cp.id=i.campaign_product_id
    join campaigns c on c.id=cp.campaign_id
    join orders o on o.id=i.order_id
    where cp.campaign_id=target_campaign and o.status <> 'cancelled'
      and public.order_in_department_period(c.organization_id,o.placed_at)
  ), earnings as (
    select coalesce(sum(quantity*unit_price-coalesce(refunded_merchandise_amount,0)),0) gross,
      coalesce(sum(contribution_amount-coalesce(refunded_contribution_amount,0)),0) earned,
      coalesce(sum(contribution_amount-coalesce(refunded_contribution_amount,0)) filter (where campaign_type='designer' or order_status in ('paid','partially_refunded','refunded')),0) collected_earned
    from eligible
  ), attributed as (
    select coalesce(sum(pi.payout_amount),0) total from payout_items pi
    join payouts p on p.id=pi.payout_id join eligible i on i.id=pi.order_item_id
    where p.status <> 'cancelled' and (i.campaign_type='designer' or i.order_status in ('paid','partially_refunded','refunded'))
  ), committed as (
    select coalesce(sum(payout_amount) filter(where status not in ('paid','cancelled')),0) pending,
      coalesce(sum(payout_amount) filter(where status='paid'),0) paid
    from payouts where campaign_id=target_campaign
  )
  select e.gross,e.earned,
    case when ca.campaign_type='designer' or (ca.ends_at is not null and now() >= ca.ends_at + interval '35 days')
      then greatest(0,e.collected_earned-a.total) else 0 end,
    c.pending,c.paid,
    exists(select 1 from payout_requests r where r.campaign_id=target_campaign and r.status in ('requested','approved','processing'))
  from earnings e cross join attributed a cross join committed c join campaigns ca on ca.id=target_campaign;
$$;
revoke all on function public.station_collection_balance(uuid) from public,anon,authenticated;
grant execute on function public.station_collection_balance(uuid) to service_role;

create or replace function public.enforce_campaign_payout_hold()
returns trigger language plpgsql security invoker set search_path=public as $$
declare campaign_row public.campaigns%rowtype;
begin
  if (tg_op='INSERT' and tg_table_name='payout_requests') or
     (tg_op='UPDATE' and new.status::text in ('approved','processing','paid') and new.status is distinct from old.status) then
    select * into campaign_row from public.campaigns where id=new.campaign_id;
    if campaign_row.campaign_type is distinct from 'designer' and
       (campaign_row.ends_at is null or now() < campaign_row.ends_at + interval '35 days') then
      raise exception 'Campaign payouts are available 35 days after the campaign ends. An end date is required.';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.enforce_campaign_payout_hold() from public,anon,authenticated;
drop trigger if exists enforce_campaign_payout_hold on public.payout_requests;
create trigger enforce_campaign_payout_hold before insert or update of status on public.payout_requests
for each row execute function public.enforce_campaign_payout_hold();
drop trigger if exists enforce_campaign_payout_hold on public.payouts;
create trigger enforce_campaign_payout_hold before update of status on public.payouts
for each row execute function public.enforce_campaign_payout_hold();
