-- Date changes affect reporting and NEW payout eligibility; never rewrite payout history.
alter table public.organizations add column if not exists reporting_start_date date;
alter table public.organizations add constraint organizations_reporting_start_date_min check (reporting_start_date is null or reporting_start_date >= date '1970-01-01');
create or replace function public.guard_department_reporting_date()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if (tg_op='INSERT' and new.reporting_start_date is not null) or
     (tg_op='UPDATE' and new.reporting_start_date is distinct from old.reporting_start_date) then
    if current_user not in ('postgres','service_role') and
       not exists(select 1 from public.platform_admins where user_id=auth.uid() and is_active) then
      raise exception 'Only a platform administrator can change the reporting start date';
    end if;
    if new.reporting_start_date > (now() at time zone 'America/Detroit')::date then
      raise exception 'Reporting start date cannot be in the future';
    end if;
  end if;
  return new;
end; $$;
create trigger guard_department_reporting_date before insert or update on public.organizations
for each row execute function public.guard_department_reporting_date();

create or replace function public.order_in_department_period(target_org uuid, placed timestamptz)
returns boolean language sql stable security invoker set search_path=public as $$
  select placed is not null
    and (placed at time zone 'America/Detroit')::date <= (now() at time zone 'America/Detroit')::date
    and (o.reporting_start_date is null or (placed at time zone 'America/Detroit')::date >= o.reporting_start_date)
  from organizations o where o.id=target_org;
$$;

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
      and o.status <> 'cancelled'
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
      and o.status <> 'cancelled'
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
    select i.* from order_items i
    join campaign_products cp on cp.id=i.campaign_product_id
    join campaigns c on c.id=cp.campaign_id
    join orders o on o.id=i.order_id
    where cp.campaign_id=target_campaign and o.status <> 'cancelled'
      and public.order_in_department_period(c.organization_id,o.placed_at)
  ), earnings as (
    select coalesce(sum(quantity*unit_price-coalesce(refunded_merchandise_amount,0)),0) gross,
      coalesce(sum(contribution_amount-coalesce(refunded_contribution_amount,0)),0) earned from eligible
  ), attributed as (
    select coalesce(sum(pi.payout_amount),0) total from payout_items pi
    join payouts p on p.id=pi.payout_id join eligible i on i.id=pi.order_item_id
    where p.status <> 'cancelled'
  ), committed as (
    select coalesce(sum(payout_amount) filter(where status not in ('paid','cancelled')),0) pending,
      coalesce(sum(payout_amount) filter(where status='paid'),0) paid
    from payouts where campaign_id=target_campaign
  )
  select e.gross,e.earned,greatest(0,e.earned-a.total),c.pending,c.paid,
    exists(select 1 from payout_requests r where r.campaign_id=target_campaign and r.status in ('requested','approved','processing'))
  from earnings e cross join attributed a cross join committed c;
$$;
revoke all on function public.station_collection_balance(uuid) from public,anon,authenticated;
grant execute on function public.station_collection_balance(uuid) to service_role;
