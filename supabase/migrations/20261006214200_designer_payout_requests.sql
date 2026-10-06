alter table public.portal_pin_credentials add column if not exists can_manage_payouts boolean not null default false;

alter table public.payout_requests add column if not exists requested_by_pin uuid references public.portal_pin_credentials(id);
alter table public.payout_requests alter column requested_by drop not null;
alter table public.payout_requests add constraint payout_request_actor_required check(requested_by is not null or requested_by_pin is not null);

create or replace function public.request_designer_payout(target_campaign uuid,input_actor text,input_note text default null)
returns uuid language plpgsql security invoker set search_path=public as $$
declare c campaigns%rowtype; generated record; request_id uuid; email_actor uuid; pin_actor uuid; allowed boolean:=false; profile_state text;
begin
 perform pg_advisory_xact_lock(hashtext(target_campaign::text));
 select ca.* into c from campaigns ca join organizations o on o.id=ca.organization_id
 where ca.id=target_campaign and ca.campaign_type='designer' and o.organization_type='designer' and o.is_active;
 if c.id is null then raise exception 'Designer program not found.'; end if;
 if c.status not in ('active','completed') then raise exception 'Designer setup must be completed first.'; end if;
 if input_actor ~ '^pin:[0-9a-f-]{36}$' then
  pin_actor:=substring(input_actor from 5)::uuid;
  select exists(select 1 from portal_pin_credentials where id=substring(input_actor from 5)::uuid and organization_id=c.organization_id and active and not must_change_pin and (role in ('owner','admin') or can_manage_payouts)) into allowed;
 elsif input_actor ~ '^user:[0-9a-f-]{36}$' then
  email_actor:=substring(input_actor from 6)::uuid;
  select exists(select 1 from platform_admins where user_id=email_actor and is_active) or exists(select 1 from organization_members where user_id=email_actor and organization_id=c.organization_id and role in ('owner','admin')) into allowed;
 end if;
 if not allowed then raise exception 'Designer payout access required.'; end if;
 select review_status into profile_state from organization_payout_profiles where organization_id=c.organization_id for share;
 if profile_state is null or profile_state='changes_requested' then raise exception 'Add or update your payment details before requesting a payout.'; end if;
 if exists(select 1 from payout_requests where campaign_id=c.id and status in ('requested','approved','processing')) then raise exception 'A payout request is already open.'; end if;
 select * into generated from generate_campaign_payout(target_campaign);
 if generated.payout_id is null or generated.payout_amount<=0 then raise exception 'There are no unpaid commissions available.'; end if;
 if c.status<>'completed' and generated.payout_amount<coalesce(c.min_payout_threshold,0) then raise exception 'Your available commission is below the minimum payout.'; end if;
 insert into payout_requests(organization_id,campaign_id,requested_by,requested_by_pin,requested_amount,status,payout_id,note)
 values(c.organization_id,c.id,email_actor,pin_actor,generated.payout_amount,'requested',generated.payout_id,left(input_note,1000)) returning id into request_id;
 insert into organization_profile_audit(organization_id,actor,action) values(c.organization_id,input_actor,'designer_payout_requested:'||request_id);
 return request_id;
end $$;
revoke all on function public.request_designer_payout(uuid,text,text) from public,anon,authenticated;
grant execute on function public.request_designer_payout(uuid,text,text) to service_role;

create or replace function public.review_designer_payout(target_request uuid,input_actor uuid,input_action text,input_note text,input_reference text)
returns void language plpgsql security invoker set search_path=public as $$
declare r payout_requests%rowtype;
begin
 if not exists(select 1 from platform_admins where user_id=input_actor and is_active) then raise exception 'Platform administrator required.'; end if;
 select * into r from payout_requests where id=target_request for update;
 if r.id is null or not exists(select 1 from campaigns where id=r.campaign_id and campaign_type='designer') then raise exception 'Designer request not found.'; end if;
 perform pg_advisory_xact_lock(hashtext(r.campaign_id::text));
 if r.payout_id is null then raise exception 'Request has no reserved payout.'; end if;
 if input_action in ('approve','processing','paid') then
  perform 1 from organization_payout_profiles where organization_id=r.organization_id and review_status='approved' for share;
  if not found then raise exception 'Approve the designer payment information before processing this payout.'; end if;
 end if;
 if input_action='approve' and r.status='requested' then
  update payout_requests set status='approved',reviewed_by=input_actor,reviewed_at=now(),admin_note=left(input_note,1000) where id=r.id;
 elsif input_action='reject' and r.status in ('requested','approved') then
  update payouts set status='cancelled' where id=r.payout_id;
  update payout_requests set status='rejected',reviewed_by=input_actor,reviewed_at=now(),admin_note=left(input_note,1000) where id=r.id;
 elsif input_action='processing' and r.status='approved' then
  update payouts set status='processing' where id=r.payout_id;
  update payout_requests set status='processing',admin_note=coalesce(left(input_note,1000),admin_note) where id=r.id;
 elsif input_action='paid' and r.status in ('approved','processing') then
  if coalesce(trim(input_reference),'')='' then raise exception 'Payment reference is required.'; end if;
  update payouts set status='paid',paid_at=now(),payment_reference=left(input_reference,200) where id=r.payout_id;
  update payout_requests set status='paid',paid_at=now(),admin_note=coalesce(left(input_note,1000),admin_note) where id=r.id;
 else raise exception 'Invalid payout transition.';
 end if;
end $$;
revoke all on function public.review_designer_payout(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.review_designer_payout(uuid,uuid,text,text,text) to service_role;
