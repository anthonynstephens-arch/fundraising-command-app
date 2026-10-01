-- Opt-in department onboarding. Existing departments keep their current access.
alter table public.organizations add column require_details boolean not null default false;
alter table public.organizations add column details_status text not null default 'incomplete' check(details_status in ('incomplete','pending','approved','changes_requested'));
alter table public.organizations add column details_version integer not null default 0;
alter table public.organizations add column details_review_note text;
alter table public.organizations add column details_reviewed_at timestamptz;
alter table public.organizations add column details_reviewed_by uuid;

create function public.department_details_missing(input_org uuid) returns text[] language plpgsql set search_path=public as $$
declare o organizations%rowtype; d jsonb; missing text[]:=array[]::text[];
begin
 select * into o from organizations where id=input_org;
 if o.id is null then raise exception 'Department not found.'; end if;
 select public.read_payout_profile(input_org)->'details' into d;
 if d is null then missing:=array_append(missing,'Payment method and payment details');
 elsif d->>'method'='ach' then
  if coalesce(d->>'bankName','')='' or coalesce(d->>'accountName','')='' or coalesce(d->>'routingNumber','')!~'^[0-9]{9}$' or coalesce(d->>'accountNumber','')!~'^[0-9]{4,17}$' then missing:=array_append(missing,'Complete ACH bank information'); end if;
 elsif d->>'method'='paypal' then
  if coalesce(d->>'paypalEmail','')!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then missing:=array_append(missing,'PayPal account email'); end if;
 elsif d->>'method'='check' then
  if exists(select 1 from unnest(array['checkPayee','address1','city','state','postalCode','country']) k where coalesce(trim(d->>k),'')='') then missing:=array_append(missing,'Check payee and complete mailing address'); end if;
 else missing:=array_append(missing,'Preferred payment method'); end if;
 if d is not null and coalesce(d->>'is501c3','') not in ('true','false') then missing:=array_append(missing,'501(c)(3) status'); end if;
 if d->>'is501c3'='true' and (coalesce(trim(d->>'legalName'),'')='' or coalesce(d->>'ein','')!~'^[0-9]{9}$' or coalesce(trim(d->>'nonprofitAddress'),'')='') then missing:=array_append(missing,'501(c)(3) legal name, EIN and registered address'); end if;
 if not exists(select 1 from agency_contacts where organization_id=input_org and role not like 'Union %' and length(trim(name))>=2 and coalesce(email,'')~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and length(trim(coalesce(phone,'')))>=7) then missing:=array_append(missing,'Agency contact with name, role, email and phone'); end if;
 if o.is_union is null then missing:=array_append(missing,'Union status set by Detroit Decal & Apparel'); end if;
 if o.is_union then
  if coalesce(trim(o.union_name),'')='' or coalesce(trim(o.union_local),'')='' then missing:=array_append(missing,'Union name and local number'); end if;
  if not exists(select 1 from agency_contacts where organization_id=input_org and role='Union president' and (coalesce(email,'')<>'' or coalesce(phone,'')<>'')) then missing:=array_append(missing,'Union president contact'); end if;
  if not exists(select 1 from agency_contacts where organization_id=input_org and role in ('Union treasurer','Union secretary-treasurer') and (coalesce(email,'')<>'' or coalesce(phone,'')<>'')) then missing:=array_append(missing,'Union treasurer or secretary-treasurer contact'); end if;
 end if;
 return missing;
end $$;
revoke all on function public.department_details_missing(uuid) from public,anon,authenticated;
grant execute on function public.department_details_missing(uuid) to service_role;

-- Do not let department users change their own requirements or approval via the Data API.
create function private.guard_department_requirements() returns trigger language plpgsql set search_path=public as $$
begin
 if current_user in ('anon','authenticated') and not private.is_platform_admin() and
 (new.require_details is distinct from old.require_details or new.is_union is distinct from old.is_union or new.details_status is distinct from old.details_status or new.details_version is distinct from old.details_version or new.details_review_note is distinct from old.details_review_note or new.details_reviewed_at is distinct from old.details_reviewed_at or new.details_reviewed_by is distinct from old.details_reviewed_by)
 then raise exception 'Department requirements and approval are controlled by the platform administrator.'; end if;
 if new.require_details is distinct from old.require_details or new.is_union is distinct from old.is_union or new.union_name is distinct from old.union_name or new.union_local is distinct from old.union_local then
  new.details_version:=old.details_version+1;new.details_status:='incomplete';new.details_review_note:=null;new.details_reviewed_at:=null;new.details_reviewed_by:=null;
 end if;
 return new;
end $$;
create trigger guard_department_requirements before update on public.organizations for each row execute function private.guard_department_requirements();

create function private.invalidate_department_details() returns trigger language plpgsql set search_path=public as $$
begin
 update organizations set details_version=details_version+1,details_status='incomplete',details_review_note=null,details_reviewed_at=null,details_reviewed_by=null where id=case when TG_OP='DELETE' then old.organization_id else new.organization_id end;
 return null;
end $$;
create trigger contact_details_changed after insert or update or delete on public.agency_contacts for each row execute function private.invalidate_department_details();
create trigger payment_details_changed after insert or update of encrypted_details on public.organization_payout_profiles for each row execute function private.invalidate_department_details();

create function public.set_department_requirements(input_org uuid,input_version integer,input_required boolean,input_union boolean,input_actor uuid) returns boolean language plpgsql set search_path=public as $$
declare o organizations%rowtype;
begin
 if not exists(select 1 from platform_admins where user_id=input_actor and is_active) then raise exception 'Platform administrator required.'; end if;
 select * into o from organizations where id=input_org for update;
 if o.id is null or o.details_version<>input_version then raise exception 'Department details changed. Reload before saving.'; end if;
 update organizations set require_details=input_required,is_union=input_union where id=input_org;
 insert into organization_profile_audit(organization_id,actor,action) values(input_org,'user:'||input_actor,'department_requirements_updated');
 return true;
end $$;
create function public.submit_department_details(input_org uuid,input_version integer,input_actor text) returns boolean language plpgsql set search_path=public as $$
declare o organizations%rowtype; missing text[];
begin
 select * into o from organizations where id=input_org for update;
 if o.id is null or not o.require_details then raise exception 'Department details are not required.'; end if;
 if o.details_version<>input_version then raise exception 'Department details changed. Check your saved details and try again.'; end if;
 if o.details_status='approved' then raise exception 'Department details are already accepted.'; end if;
 missing:=department_details_missing(input_org);
 if cardinality(missing)>0 then raise exception 'Still needed: %',array_to_string(missing,', '); end if;
 update organizations set details_status='pending',details_review_note=null,details_reviewed_at=null,details_reviewed_by=null where id=input_org;
 insert into organization_profile_audit(organization_id,actor,action) values(input_org,input_actor,'department_details_submitted:v'||input_version);
 return true;
end $$;
create function public.review_department_details(input_org uuid,input_version integer,input_status text,input_note text,input_actor uuid) returns boolean language plpgsql set search_path=public as $$
declare o organizations%rowtype;
begin
 if not exists(select 1 from platform_admins where user_id=input_actor and is_active) then raise exception 'Platform administrator required.'; end if;
 if input_status not in ('approved','changes_requested') or length(coalesce(input_note,''))>1000 or (input_status='changes_requested' and length(trim(coalesce(input_note,'')))<5) then raise exception 'Provide a review note when requesting changes.'; end if;
 select * into o from organizations where id=input_org for update;
 if o.id is null or o.details_version<>input_version or o.details_status<>'pending' then raise exception 'Department details changed or were already reviewed. Reload before reviewing.'; end if;
 if input_status='approved' and cardinality(department_details_missing(input_org))>0 then raise exception 'Complete all required department details before accepting.'; end if;
 update organizations set details_status=input_status,details_review_note=nullif(trim(input_note),''),details_reviewed_at=now(),details_reviewed_by=input_actor where id=input_org;
 insert into organization_profile_audit(organization_id,actor,action) values(input_org,'user:'||input_actor,'department_details_'||input_status||':v'||input_version);
 return true;
end $$;
revoke all on function public.set_department_requirements(uuid,integer,boolean,boolean,uuid),public.submit_department_details(uuid,integer,text),public.review_department_details(uuid,integer,text,text,uuid) from public,anon,authenticated;
grant execute on function public.set_department_requirements(uuid,integer,boolean,boolean,uuid),public.submit_department_details(uuid,integer,text),public.review_department_details(uuid,integer,text,text,uuid) to service_role;

-- Restrictive policies also protect direct authenticated Supabase reads.
create function private.department_data_allowed(input_org uuid) returns boolean language sql stable set search_path=public as $$
 select private.is_platform_admin() or exists(select 1 from organizations where id=input_org and is_active and (not require_details or details_status='approved'));
$$;
grant usage on schema private to authenticated;
grant execute on function private.department_data_allowed(uuid) to authenticated;
create policy department_details_gate on public.campaigns as restrictive for all to authenticated using(private.department_data_allowed(organization_id)) with check(private.department_data_allowed(organization_id));
create policy department_details_gate on public.orders as restrictive for all to authenticated using(private.department_data_allowed(organization_id)) with check(private.department_data_allowed(organization_id));
create policy department_details_gate on public.payouts as restrictive for all to authenticated using(private.department_data_allowed(organization_id)) with check(private.department_data_allowed(organization_id));
create policy department_details_gate on public.payout_requests as restrictive for all to authenticated using(private.department_data_allowed(organization_id)) with check(private.department_data_allowed(organization_id));
create policy department_details_gate on public.portal_notification_events as restrictive for select to authenticated using(private.department_data_allowed(organization_id));
create policy department_details_gate on public.order_items as restrictive for select to authenticated using(exists(select 1 from orders where id=order_items.order_id and private.department_data_allowed(organization_id)));
create policy department_details_gate on public.payout_items as restrictive for select to authenticated using(exists(select 1 from payouts where id=payout_items.payout_id and private.department_data_allowed(organization_id)));
-- Internal notifications are not emitted while department access is locked, preventing push/email data leaks.
create function private.gate_department_notifications() returns trigger language plpgsql set search_path=public as $$
begin
 if exists(select 1 from organizations where id=new.organization_id and require_details and details_status<>'approved') then return null; end if;
 return new;
end $$;
create trigger gate_department_notifications before insert on public.portal_notification_events for each row execute function private.gate_department_notifications();
-- Enforce the requirement for requests made by any route or RPC, including station cash-outs.
create function private.gate_department_payout_request() returns trigger language plpgsql set search_path=public as $$
begin
 if exists(select 1 from organizations where id=new.organization_id and require_details and details_status<>'approved') then raise exception 'Department details must be accepted before requesting a payout.'; end if;
 return new;
end $$;
create trigger gate_department_payout_request before insert on public.payout_requests for each row execute function private.gate_department_payout_request();

revoke all on function private.guard_department_requirements(),private.invalidate_department_details(),private.gate_department_notifications(),private.gate_department_payout_request(),private.department_data_allowed(uuid) from public,anon,authenticated;
grant execute on function private.department_data_allowed(uuid) to authenticated;
