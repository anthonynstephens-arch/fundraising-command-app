
create table public.portal_notification_events (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 campaign_id uuid references public.campaigns(id) on delete cascade, event_key text not null unique,
 category text not null check(category in ('new_sales','payout_updates','campaign_milestones','sync_issues')),
 title text not null, body text not null, href text not null,
 created_at timestamptz not null default now(), processed_at timestamptz, lease_until timestamptz, attempts integer not null default 0
);
create index portal_events_org_date on public.portal_notification_events(organization_id,created_at desc);
create index portal_events_pending on public.portal_notification_events(created_at) where processed_at is null;
create table public.portal_push_subscriptions (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 identity_type text not null check(identity_type in ('user','pin')), identity_id uuid not null,
 endpoint text not null, subscription jsonb not null, created_at timestamptz not null default now(),
 unique(organization_id,identity_type,identity_id,endpoint)
);
create table public.portal_push_deliveries (
 event_id uuid not null references public.portal_notification_events(id) on delete cascade,
 subscription_id uuid not null references public.portal_push_subscriptions(id) on delete cascade,
 sent_at timestamptz not null default now(), primary key(event_id,subscription_id)
);
create table public.portal_push_config (
 id boolean primary key default true check(id), dispatch_token text not null default encode(gen_random_bytes(32),'hex'),
 public_key text, private_key text
);
insert into public.portal_push_config(id) values(true);
alter table public.portal_notification_preferences add column notifications_read_at timestamptz;
alter table public.portal_notification_preferences add column onboarding_version integer not null default 1;
alter table public.portal_notification_events enable row level security;
alter table public.portal_push_subscriptions enable row level security;
alter table public.portal_push_deliveries enable row level security;
alter table public.portal_push_config enable row level security;
revoke all on public.portal_notification_events,public.portal_push_subscriptions,public.portal_push_deliveries,public.portal_push_config from anon,authenticated;
grant all on public.portal_notification_events,public.portal_push_subscriptions,public.portal_push_deliveries,public.portal_push_config to service_role;

create or replace function public.queue_portal_sale_notification() returns trigger language plpgsql set search_path=public as $$
declare c record; o record; total_raised numeric; before_raised numeric; milestone integer;
begin
 select ca.* into c from campaign_products cp join campaigns ca on ca.id=cp.campaign_id where cp.id=new.campaign_product_id;
 select * into o from orders where id=new.order_id;
 if c.id is null or o.status='cancelled' or o.placed_at is null or o.placed_at < now()-interval '1 day' then return new; end if;
 if not order_in_department_period(c.organization_id,o.placed_at) then return new; end if;
 insert into portal_notification_events(organization_id,campaign_id,event_key,category,title,body,href)
 values(c.organization_id,c.id,'sale:'||c.id||':'||o.id,'new_sales','New fundraiser order',c.name||' received a new order.','/portal/orders?org='||c.organization_id||'&campaign='||c.id) on conflict(event_key) do nothing;
 if c.goal_amount>0 then
 select coalesce(sum(i.contribution_amount-coalesce(i.refunded_contribution_amount,0)),0) into total_raised
 from order_items i join campaign_products cp on cp.id=i.campaign_product_id join orders ord on ord.id=i.order_id
 where cp.campaign_id=c.id and ord.status<>'cancelled' and order_in_department_period(c.organization_id,ord.placed_at);
 before_raised:=total_raised-new.contribution_amount+coalesce(new.refunded_contribution_amount,0);
 foreach milestone in array array[25,50,75,100] loop
 if before_raised<c.goal_amount*milestone/100 and total_raised>=c.goal_amount*milestone/100 then
 insert into portal_notification_events(organization_id,campaign_id,event_key,category,title,body,href)
 values(c.organization_id,c.id,'goal:'||c.id||':'||c.goal_amount||':'||milestone,'campaign_milestones',milestone||'% of goal reached',c.name||' reached a fundraising milestone.','/portal/progress?org='||c.organization_id||'&campaign='||c.id) on conflict(event_key) do nothing;
 end if; end loop; end if;
 return new;
end $$;
create trigger portal_sale_notification after insert on public.order_items for each row execute function public.queue_portal_sale_notification();

create or replace function public.queue_portal_payout_notification() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='UPDATE' and new.status is not distinct from old.status then return new; end if;
 insert into portal_notification_events(organization_id,campaign_id,event_key,category,title,body,href)
 values(new.organization_id,new.campaign_id,tg_table_name||':'||new.id||':'||new.status,'payout_updates','Payout update','Payout status: '||new.status||'. Open Payouts for details.','/portal/payouts?org='||new.organization_id||'&campaign='||new.campaign_id)
 on conflict(event_key) do nothing;
 return new;
end $$;
create trigger portal_payout_notification after insert or update of status on public.payouts for each row execute function public.queue_portal_payout_notification();
create trigger portal_request_notification after insert or update of status on public.payout_requests for each row execute function public.queue_portal_payout_notification();

create or replace function public.queue_portal_sync_notification() returns trigger language plpgsql set search_path=public as $$
declare c record;
begin
 if new.error_message is null or (tg_op='UPDATE' and new.error_message is not distinct from old.error_message) then return new; end if;
 for c in select distinct ca.id,ca.organization_id from campaigns ca where ca.id in (
 select cp.campaign_id from campaign_products cp where cp.shopify_variant_id in
 (select x->>'variant_id' from jsonb_array_elements(coalesce(new.payload->'line_items','[]'::jsonb)) x)
 union select l.campaign_id from campaign_shopify_collections l where new.event_type='collections/update' and l.shopify_collection_id=new.payload->>'id'
 ) loop
 insert into portal_notification_events(organization_id,campaign_id,event_key,category,title,body,href)
 values(c.organization_id,c.id,'sync:'||new.id||':'||c.id,'sync_issues','Campaign sync needs attention','A Shopify update could not be processed. Ask your campaign administrator to review the integration.','/portal/products?org='||c.organization_id||'&campaign='||c.id)
 on conflict(event_key) do nothing;
 end loop;
 return new;
end $$;
create trigger portal_sync_notification after insert or update of error_message on public.webhook_events for each row execute function public.queue_portal_sync_notification();

create or replace function public.dispatch_portal_push() returns bigint language sql set search_path=public as $$
 select net.http_post(
 url:='https://cuzxnryslupnrlasntxl.supabase.co/functions/v1/portal-push-dispatch',
 headers:=jsonb_build_object('Content-Type','application/json','x-dispatch-token',dispatch_token),
 body:='{}'::jsonb,timeout_milliseconds:=10000
 ) from portal_push_config where id=true and exists(select 1 from portal_notification_events where processed_at is null and attempts<5);
$$;
revoke all on function public.dispatch_portal_push() from public,anon,authenticated;
grant execute on function public.dispatch_portal_push() to service_role;
revoke all on function public.queue_portal_sale_notification(),public.queue_portal_payout_notification(),public.queue_portal_sync_notification() from public,anon,authenticated;

