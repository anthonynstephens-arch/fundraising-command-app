-- Independent email state: device delivery must never consume the email queue.
alter table public.portal_notification_events add column email_enqueued_at timestamptz;
alter table public.portal_notification_events add column email_lease_until timestamptz;
-- Start with new activity; do not email historical alerts on launch.
update public.portal_notification_events set email_enqueued_at=now();
create index portal_events_email_pending on public.portal_notification_events(created_at) where email_enqueued_at is null;
create table public.portal_email_templates (
 category text primary key check(category in ('new_sales','payout_updates','campaign_milestones','sync_issues','access_request','access_approved')),
 draft jsonb not null, published jsonb, version integer not null default 1, updated_at timestamptz not null default now(), published_at timestamptz, updated_by uuid
);
create table public.portal_notification_emails (
 id uuid primary key default gen_random_uuid(),event_id uuid not null references public.portal_notification_events(id) on delete cascade,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 recipient text not null, identity_type text not null check(identity_type in ('user','pin')),identity_id uuid not null,
 status text not null default 'queued' check(status in ('queued','sending','sent','skipped','failed')),
 attempts integer not null default 0,lease_until timestamptz,lease_token uuid,next_attempt_at timestamptz not null default now(),
 created_at timestamptz not null default now(),sent_at timestamptz,last_error text,
 unique(event_id,recipient)
);
create index portal_notification_emails_pending on public.portal_notification_emails(next_attempt_at) where status in ('queued','sending');
alter table public.portal_email_templates enable row level security;
alter table public.portal_notification_emails enable row level security;
revoke all on public.portal_email_templates,public.portal_notification_emails from public,anon,authenticated;
grant all on public.portal_email_templates,public.portal_notification_emails to service_role;
create function public.claim_notification_email_events() returns setof public.portal_notification_events language sql set search_path=public as $$
 update portal_notification_events set email_lease_until=now()+interval '2 minutes' where id in
 (select id from portal_notification_events where email_enqueued_at is null and (email_lease_until is null or email_lease_until<now()) order by created_at for update skip locked limit 20) returning *;
$$;
create function public.claim_notification_emails() returns setof public.portal_notification_emails language sql set search_path=public as $$
 update portal_notification_emails set status='sending',lease_until=now()+interval '3 minutes',lease_token=gen_random_uuid(),attempts=attempts+1 where id in
 (select id from portal_notification_emails where status in ('queued','sending') and attempts<5 and next_attempt_at<=now() and (lease_until is null or lease_until<now()) order by created_at for update skip locked limit 10) returning *;
$$;
create function public.save_email_template(input_category text,input_design jsonb,input_version integer,input_publish boolean,input_actor uuid) returns integer language plpgsql set search_path=public as $$
declare v integer;
begin
 perform pg_advisory_xact_lock(hashtext('email-template:'||input_category));
 select version into v from portal_email_templates where category=input_category;
 if coalesce(v,0)<>input_version then raise exception 'Template changed. Reload before saving.'; end if;
 insert into portal_email_templates(category,draft,published,version,published_at,updated_by)
 values(input_category,input_design,case when input_publish then input_design else null end,1,case when input_publish then now() else null end,input_actor)
 on conflict(category) do update set draft=input_design,published=case when input_publish then input_design else portal_email_templates.published end,
 version=portal_email_templates.version+1,updated_at=now(),published_at=case when input_publish then now() else portal_email_templates.published_at end,updated_by=input_actor returning version into v;
 return v;
end $$;
revoke all on function public.claim_notification_email_events(),public.claim_notification_emails(),public.save_email_template(text,jsonb,integer,boolean,uuid) from public,anon,authenticated;
grant execute on function public.claim_notification_email_events(),public.claim_notification_emails(),public.save_email_template(text,jsonb,integer,boolean,uuid) to service_role;

-- Every changed payment profile requires a fresh review of that exact version.
alter table public.organization_payout_profiles add column review_status text not null default 'pending' check(review_status in ('pending','approved','changes_requested'));
alter table public.organization_payout_profiles add column reviewed_at timestamptz;
alter table public.organization_payout_profiles add column reviewed_by uuid;
alter table public.organization_payout_profiles add column review_note text;
create function public.reset_payout_profile_review() returns trigger language plpgsql set search_path=public as $$
begin
 new.review_status:='pending';new.reviewed_at:=null;new.reviewed_by:=null;new.review_note:=null;return new;
end $$;
create trigger payout_profile_needs_review before update of encrypted_details on public.organization_payout_profiles for each row execute function public.reset_payout_profile_review();
create function public.review_payout_profile(input_org uuid,input_version integer,input_status text,input_note text,input_actor uuid) returns boolean language plpgsql set search_path=public as $$
declare current_profile public.organization_payout_profiles%rowtype;
begin
 if input_status not in ('approved','changes_requested') then raise exception 'Invalid decision'; end if;
 if length(coalesce(input_note,''))>1000 or (input_status='changes_requested' and length(trim(coalesce(input_note,'')))<5) then raise exception 'Provide a review note.'; end if;
 perform pg_advisory_xact_lock(hashtext('payout-profile:'||input_org));
 select * into current_profile from organization_payout_profiles where organization_id=input_org for update;
 if current_profile.version is distinct from input_version or current_profile.review_status<>'pending' then raise exception 'Profile changed or was already reviewed. Reload before reviewing.'; end if;
 update organization_payout_profiles set review_status=input_status,reviewed_at=now(),reviewed_by=input_actor,review_note=nullif(trim(input_note),'') where organization_id=input_org;
 insert into organization_profile_audit(organization_id,actor,action) values(input_org,'user:'||input_actor,'payout_profile_'||input_status||':v'||input_version);
 insert into portal_notification_events(organization_id,event_key,category,title,body,href)
 values(input_org,'profile-review:'||input_org||':'||input_version,'payout_updates',case when input_status='approved' then 'Payment information approved' else 'Payment information needs an update' end,
 case when input_status='approved' then 'Your payment information has been reviewed and approved. This does not mean a payment has been sent.' else 'Please review the requested changes in Payout Engine.' end,'/portal/payouts?org='||input_org);
 return true;
end $$;
revoke all on function public.reset_payout_profile_review(),public.review_payout_profile(uuid,integer,text,text,uuid) from public,anon,authenticated;
grant execute on function public.review_payout_profile(uuid,integer,text,text,uuid) to service_role;

-- Aggregates run in SQL so totals are not truncated by the REST row limit.
create function public.command_center_snapshot() returns jsonb language sql stable set search_path=public as $$
 with sales as (
 select c.organization_id,count(distinct o.id) orders,coalesce(sum(i.unit_price*i.quantity),0) sales,
 coalesce(sum(i.contribution_amount-coalesce(i.refunded_contribution_amount,0)),0) raised,max(o.placed_at) last_order_at
 from order_items i join orders o on o.id=i.order_id join campaign_products cp on cp.id=i.campaign_product_id join campaigns c on c.id=cp.campaign_id
 where o.status<>'cancelled' and order_in_department_period(c.organization_id,o.placed_at) group by c.organization_id
 ), agencies as (
 select o.id,o.name,o.slug,o.logo_url,o.organization_type,o.is_active,o.reporting_start_date,
 coalesce(s.orders,0) orders,coalesce(s.sales,0) sales,coalesce(s.raised,0) raised,s.last_order_at,
 (select count(*) from campaigns c where c.organization_id=o.id and c.status='active') active_campaigns,
 (select count(*) from portal_pin_credentials p where p.organization_id=o.id and p.access_status='pending') access_requests,
 p.review_status,p.version profile_version,p.updated_at profile_updated_at,
 (select count(*) from payout_requests r where r.organization_id=o.id and r.status='requested') payout_requests,
 (select coalesce(sum(r.requested_amount),0) from payout_requests r where r.organization_id=o.id and r.status in ('requested','approved','processing')) requested_amount
 from organizations o left join sales s on s.organization_id=o.id left join organization_payout_profiles p on p.organization_id=o.id
 ) select jsonb_build_object(
 'agencies',coalesce((select jsonb_agg(to_jsonb(a) order by a.name) from agencies a),'[]'::jsonb),
 'applications',(select count(*) from applications where status='pending'),
 'emailFailed',(select count(*) from portal_notification_emails where status='failed' or (status='sending' and attempts>=5 and lease_until<now())),
 'emailQueued',(select count(*) from portal_notification_emails where status in ('queued','sending')),
 'accessEmailIssues',(select count(*) from portal_access_email_queue where sent_at is null and last_error is not null),
 'syncIssues',(select count(*) from webhook_events where error_message is not null and created_at>now()-interval '7 days'),
 'activity',coalesce((select jsonb_agg(to_jsonb(e)) from (select e.id,e.organization_id,o.name organization_name,e.category,e.title,e.created_at from portal_notification_events e join organizations o on o.id=e.organization_id order by e.created_at desc limit 20)e),'[]'::jsonb),
 'updatedAt',now());
$$;
revoke all on function public.command_center_snapshot() from public,anon,authenticated;
grant execute on function public.command_center_snapshot() to service_role;
create function public.notify_payout_profile_submission() returns trigger language plpgsql set search_path=public as $$
begin
 insert into portal_notification_events(organization_id,event_key,category,title,body,href)
 values(new.organization_id,'profile-submitted:'||new.organization_id||':'||new.version,'payout_updates','Payment information submitted for review','Payment information has been saved securely and is awaiting platform review. Track the review in Payout Engine.','/portal/payouts?org='||new.organization_id) on conflict(event_key) do nothing;
 return new;
end $$;
create trigger payout_profile_submission after insert or update of encrypted_details on public.organization_payout_profiles for each row execute function public.notify_payout_profile_submission();
revoke all on function public.notify_payout_profile_submission() from public,anon,authenticated;
