alter table public.organizations add column if not exists access_requests_enabled boolean not null default true;
alter table public.organizations add column if not exists is_union boolean;
alter table public.organizations add column if not exists union_name text;
alter table public.organizations add column if not exists union_local text;

create schema if not exists payout_private;
revoke all on schema payout_private from public,anon,authenticated;
grant usage on schema payout_private to service_role;
create table payout_private.encryption_keys(id boolean primary key default true check(id), secret text not null);
insert into payout_private.encryption_keys values(true,encode(extensions.gen_random_bytes(32),'hex'));
revoke all on payout_private.encryption_keys from public,anon,authenticated;
grant select on payout_private.encryption_keys to service_role;
create table public.organization_payout_profiles (
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 encrypted_details bytea not null, version integer not null default 1,
 updated_at timestamptz not null default now()
);
create table public.organization_profile_audit (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 actor text not null, action text not null, created_at timestamptz not null default now()
);
create table public.agency_contacts (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null check(length(name) between 2 and 120), role text not null check(length(role) between 1 and 100),
 email text, phone text, notes text, created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index agency_contacts_org on public.agency_contacts(organization_id);
create index organization_profile_audit_org on public.organization_profile_audit(organization_id,created_at desc);
alter table public.organization_payout_profiles enable row level security;
alter table public.organization_profile_audit enable row level security;
alter table public.agency_contacts enable row level security;
revoke all on public.organization_payout_profiles,public.organization_profile_audit,public.agency_contacts from public,anon,authenticated;
grant all on public.organization_payout_profiles,public.organization_profile_audit,public.agency_contacts to service_role;

create function public.read_payout_profile(input_org uuid) returns jsonb language sql set search_path=public,extensions as $$
 select jsonb_build_object('details',pgp_sym_decrypt(p.encrypted_details,k.secret)::jsonb,'version',p.version,'updatedAt',p.updated_at)
 from organization_payout_profiles p cross join payout_private.encryption_keys k where p.organization_id=input_org;
$$;
create function public.save_payout_profile(input_org uuid,input_details jsonb,input_version integer,input_actor text) returns integer language plpgsql set search_path=public,extensions as $$
declare current_version integer; next_version integer; key text;
begin
 perform pg_advisory_xact_lock(hashtext('payout-profile:'||input_org));
 select version into current_version from organization_payout_profiles where organization_id=input_org;
 if coalesce(current_version,0)<>input_version then raise exception 'Profile changed. Reload before saving.'; end if;
 select secret into key from payout_private.encryption_keys;
 next_version:=coalesce(current_version,0)+1;
 insert into organization_payout_profiles(organization_id,encrypted_details,version)
 values(input_org,pgp_sym_encrypt(input_details::text,key,'cipher-algo=aes256'),next_version)
 on conflict(organization_id) do update set encrypted_details=excluded.encrypted_details,version=next_version,updated_at=now();
 insert into organization_profile_audit(organization_id,actor,action) values(input_org,input_actor,'payout_profile_updated');
 return next_version;
end $$;
revoke all on function public.read_payout_profile(uuid),public.save_payout_profile(uuid,jsonb,integer,text) from public,anon,authenticated;
grant execute on function public.read_payout_profile(uuid),public.save_payout_profile(uuid,jsonb,integer,text) to service_role;

-- Seed the directory from existing agency contact information without changing access.
insert into public.agency_contacts(organization_id,name,role,email,phone)
select id,contact_name,'Main contact',contact_email,contact_phone from organizations where length(trim(contact_name))>=2;

create or replace function public.request_department_access(input_org uuid,input_name text,input_email text,input_pin text,input_fingerprint text,input_recipients text[])
returns uuid language plpgsql set search_path=public,extensions as $$
declare org uuid; org_name text; new_id uuid; limiter public.portal_access_rate_limits%rowtype; recipient_email text;
begin
 if length(trim(input_name)) not between 2 and 100 or length(input_email)>254 or input_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or input_pin !~ '^[0-9]{4,8}$' then raise exception 'Enter a name, valid email, and a 4–8 digit PIN.'; end if;
 select id,name into org,org_name from organizations where id=input_org and is_active and access_requests_enabled;
 if org is null then raise exception 'Department access is unavailable.'; end if;
 insert into portal_access_rate_limits(fingerprint,attempts) values(input_fingerprint,1)
 on conflict(fingerprint) do update set attempts=case when portal_access_rate_limits.window_start<now()-interval '1 hour' then 1 else portal_access_rate_limits.attempts+1 end,
 window_start=case when portal_access_rate_limits.window_start<now()-interval '1 hour' then now() else portal_access_rate_limits.window_start end returning * into limiter;
 if limiter.attempts>5 then raise exception 'Too many requests.'; end if;
 delete from portal_access_rate_limits where window_start<now()-interval '2 days';
 perform pg_advisory_xact_lock(hashtext('portal_pin_global_unique'));
 if exists(select 1 from portal_pin_credentials where organization_id=org and lower(email)=lower(trim(input_email))) then return null; end if;
 if exists(select 1 from portal_pin_credentials where pin_hash=crypt(input_pin,pin_hash)) then raise exception 'Please choose a different PIN.'; end if;
 insert into portal_pin_credentials(organization_id,display_name,email,role,pin_hash,active,must_change_pin,access_status)
 values(org,trim(input_name),lower(trim(input_email)),'viewer',crypt(input_pin,gen_salt('bf',10)),false,false,'pending') returning id into new_id;
 for recipient_email in
  select distinct lower(address) from unnest(input_recipients) as address where address is not null
  union select distinct lower(email) from portal_pin_credentials where organization_id=org and active and role in ('admin','owner') and email is not null
 loop
  insert into portal_access_email_queue(credential_id,kind,recipient,subject,body)
  values(new_id,'requested',recipient_email,org_name||' — access request',trim(input_name)||' ('||lower(trim(input_email))||') requested member access.'||E'\n\nReview and approve in Users:\nhttps://fundraisercommand.com/portal/members?org='||org||E'\n\nTheir PIN remains inactive until approved.');
 end loop;
 return new_id;
end $$;
revoke all on function public.request_department_access(uuid,text,text,text,text,text[]) from public,anon,authenticated;
grant execute on function public.request_department_access(uuid,text,text,text,text,text[]) to service_role;


create or replace function public.approve_portal_access(input_id uuid)
returns boolean language plpgsql set search_path=public,extensions as $$
declare c public.portal_pin_credentials%rowtype; org_name text; org_slug text;
begin
 perform pg_advisory_xact_lock(hashtext('portal_pin_global_unique'));
 select * into c from portal_pin_credentials where id=input_id for update;
 if c.id is null then raise exception 'Request not found.'; end if;
 if c.access_status<>'pending' then return false; end if;
 select name,slug into org_name,org_slug from organizations where id=c.organization_id and is_active;
 if org_slug is null then raise exception 'Department inactive.'; end if;
 update portal_pin_credentials set active=true,access_status='approved',updated_at=now() where id=c.id;
 insert into portal_access_email_queue(credential_id,kind,recipient,subject,body)
 values(c.id,'approved',c.email,'Your '||org_name||' portal access is approved',
 'Hi '||c.display_name||E',\n\nYour department portal access has been approved. Sign in with the PIN you chose when requesting access.\n\nhttps://fundraisercommand.com/departments/'||org_slug||E'/login\n\nFundraiser Command') on conflict do nothing;
 return true;
end $$;
revoke all on function public.approve_portal_access(uuid) from public,anon,authenticated;
grant execute on function public.approve_portal_access(uuid) to service_role;


alter table payout_private.encryption_keys enable row level security;
