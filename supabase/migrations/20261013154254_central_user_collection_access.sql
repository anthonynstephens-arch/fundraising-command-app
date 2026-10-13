-- Preserve today's access as explicit assignments; new collections require assignment.
insert into public.portal_pin_campaign_access(credential_id,campaign_id)
select p.id,c.id from public.portal_pin_credentials p join public.campaigns c on c.organization_id=p.organization_id
on conflict do nothing;
create table public.portal_user_campaign_access (
 user_id uuid not null references auth.users(id) on delete cascade,
 campaign_id uuid not null references public.campaigns(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,campaign_id)
);
alter table public.portal_user_campaign_access enable row level security;
revoke all on public.portal_user_campaign_access from public,anon,authenticated;
grant all on public.portal_user_campaign_access to service_role;
create index portal_user_campaign_access_campaign_idx on public.portal_user_campaign_access(campaign_id);
insert into public.portal_user_campaign_access(user_id,campaign_id)
select m.user_id,c.id from public.organization_members m join public.campaigns c on c.organization_id=m.organization_id on conflict do nothing;
create table public.portal_user_sign_ins (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 session_id text not null unique, logged_in_at timestamptz not null default now(), method text not null default 'email'
);
alter table public.portal_user_sign_ins enable row level security;
revoke all on public.portal_user_sign_ins from public,anon,authenticated;
grant all on public.portal_user_sign_ins to service_role;
create index portal_user_sign_ins_user_idx on public.portal_user_sign_ins(user_id,logged_in_at desc);
create table public.collection_assignment_emails (
 id uuid primary key default gen_random_uuid(), identity_type text not null check(identity_type in ('pin','user')),
 identity_id uuid not null, campaign_id uuid not null references public.campaigns(id) on delete cascade,
 recipient text not null, created_at timestamptz not null default now(), sent_at timestamptz,
 attempts integer not null default 0, last_error text, lease_until timestamptz, cancelled_at timestamptz
);
alter table public.collection_assignment_emails enable row level security;
revoke all on public.collection_assignment_emails from public,anon,authenticated;
grant all on public.collection_assignment_emails to service_role;
create index collection_assignment_emails_pending_idx on public.collection_assignment_emails(created_at) where sent_at is null and cancelled_at is null;
-- One atomic change prevents duplicate notifications on retries.
create function public.set_collection_assignment(kind text, identity uuid, campaign uuid, assigned boolean, recipient_email text)
returns boolean language plpgsql set search_path=public as $$
declare changed integer;
begin
 if kind='pin' then
  if assigned then insert into portal_pin_campaign_access values(identity,campaign,now()) on conflict do nothing;
  else delete from portal_pin_campaign_access where credential_id=identity and campaign_id=campaign; end if;
 elsif kind='user' then
  if assigned then insert into portal_user_campaign_access values(identity,campaign,now()) on conflict do nothing;
  else delete from portal_user_campaign_access where user_id=identity and campaign_id=campaign; end if;
 else raise exception 'Invalid identity'; end if;
 get diagnostics changed = row_count;
 if not assigned then update collection_assignment_emails set cancelled_at=now() where identity_type=kind and identity_id=identity and campaign_id=campaign and sent_at is null; end if;
 if assigned and changed>0 and nullif(trim(recipient_email),'') is not null then
  insert into collection_assignment_emails(identity_type,identity_id,campaign_id,recipient) values(kind,identity,campaign,recipient_email);
 end if;
 return changed>0;
end $$;
revoke all on function public.set_collection_assignment(text,uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.set_collection_assignment(text,uuid,uuid,boolean,text) to service_role;
create function public.claim_collection_assignment_emails() returns setof public.collection_assignment_emails language sql set search_path=public as $$
 update collection_assignment_emails set attempts=attempts+1,lease_until=now()+interval '5 minutes'
 where id in (select id from collection_assignment_emails where sent_at is null and cancelled_at is null and attempts<5 and (lease_until is null or lease_until<now()) order by created_at for update skip locked limit 10) returning *;
$$;
revoke all on function public.claim_collection_assignment_emails() from public,anon,authenticated;
grant execute on function public.claim_collection_assignment_emails() to service_role;
create table public.collection_history_imports (
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 cursor text, through_date date not null default current_date, state text not null default 'pending',
 scanned integer not null default 0, imported integer not null default 0, items integer not null default 0,
 updated_at timestamptz not null default now(), last_error text, lease_until timestamptz
);
alter table public.collection_history_imports enable row level security;
revoke all on public.collection_history_imports from public,anon,authenticated;
grant all on public.collection_history_imports to service_role;
-- Email users can inspect only their own assignments. Restrictive policies close direct REST reads too.
grant select on public.portal_user_campaign_access to authenticated;
create policy own_collection_assignments on public.portal_user_campaign_access for select to authenticated using(user_id=(select auth.uid()));
create policy assigned_campaign_only on public.campaigns as restrictive for all to authenticated
using ((select private.is_platform_admin()) or exists(select 1 from public.portal_user_campaign_access g where g.user_id=(select auth.uid()) and g.campaign_id=campaigns.id))
with check ((select private.is_platform_admin()) or exists(select 1 from public.portal_user_campaign_access g where g.user_id=(select auth.uid()) and g.campaign_id=campaigns.id));
create policy assigned_products_only on public.campaign_products as restrictive for all to authenticated
using ((select private.is_platform_admin()) or exists(select 1 from public.portal_user_campaign_access g where g.user_id=(select auth.uid()) and g.campaign_id=campaign_products.campaign_id))
with check ((select private.is_platform_admin()) or exists(select 1 from public.portal_user_campaign_access g where g.user_id=(select auth.uid()) and g.campaign_id=campaign_products.campaign_id));
create policy assigned_orders_only on public.orders as restrictive for select to authenticated
using ((select private.is_platform_admin()) or exists(select 1 from public.portal_user_campaign_access g where g.user_id=(select auth.uid()) and g.campaign_id=orders.campaign_id));
create policy assigned_items_only on public.order_items as restrictive for select to authenticated
using ((select private.is_platform_admin()) or exists(select 1 from public.campaign_products p join public.portal_user_campaign_access g on g.campaign_id=p.campaign_id where p.id=order_items.campaign_product_id and g.user_id=(select auth.uid())));
create policy assigned_payouts_only on public.payouts as restrictive for select to authenticated
using ((select private.is_platform_admin()) or exists(select 1 from public.portal_user_campaign_access g where g.user_id=(select auth.uid()) and g.campaign_id=payouts.campaign_id));
insert into public.portal_user_sign_ins(user_id,session_id,logged_in_at,method)
select user_id,id::text,created_at,'existing session' from auth.sessions on conflict do nothing;
