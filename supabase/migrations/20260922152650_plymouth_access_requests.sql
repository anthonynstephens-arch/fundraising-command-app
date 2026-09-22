alter table public.portal_pin_credentials
 add column if not exists email text,
 add column if not exists access_status text not null default 'approved' check(access_status in ('pending','approved'));
create unique index portal_pin_request_email on public.portal_pin_credentials(organization_id,lower(email)) where email is not null;
create table public.portal_access_email_queue (
 id uuid primary key default gen_random_uuid(),
 credential_id uuid not null references public.portal_pin_credentials(id) on delete cascade,
 kind text not null check(kind in ('requested','approved')),
 recipient text not null, subject text not null, body text not null,
 created_at timestamptz not null default now(), sent_at timestamptz,
 attempts integer not null default 0, lease_until timestamptz, last_error text,
 unique(credential_id,kind,recipient)
);
alter table public.portal_access_email_queue enable row level security;
revoke all on public.portal_access_email_queue from public,anon,authenticated;
grant all on public.portal_access_email_queue to service_role;
create index portal_access_email_pending on public.portal_access_email_queue(created_at) where sent_at is null;
create table public.portal_access_rate_limits (
 fingerprint text primary key, window_start timestamptz not null default now(), attempts integer not null default 0
);
alter table public.portal_access_rate_limits enable row level security;
revoke all on public.portal_access_rate_limits from public,anon,authenticated;
grant all on public.portal_access_rate_limits to service_role;

create or replace function public.request_plymouth_access(input_name text,input_email text,input_pin text,input_fingerprint text,input_recipients text[])
returns uuid language plpgsql set search_path=public,extensions as $$
declare org uuid; new_id uuid; limiter public.portal_access_rate_limits%rowtype; recipient_email text;
begin
 if length(trim(input_name)) not between 2 and 100 or length(input_email)>254 or input_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or input_pin !~ '^[0-9]{4,8}$' then raise exception 'Enter a name, valid email, and a 4–8 digit PIN.'; end if;
 select id into org from organizations where slug='plymouth-township-fire-department' and is_active;
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
  values(new_id,'requested',recipient_email,'Plymouth Township Fire — access request',trim(input_name)||' ('||lower(trim(input_email))||') requested member access.'||E'\n\nReview and approve in Users:\nhttps://fundraisercommand.com/portal/members?org='||org||E'\n\nTheir PIN remains inactive until approved.');
 end loop;
 return new_id;
end $$;
revoke all on function public.request_plymouth_access(text,text,text,text,text[]) from public,anon,authenticated;
grant execute on function public.request_plymouth_access(text,text,text,text,text[]) to service_role;

-- Shared guard covers approval and legacy enable/create/change-PIN paths.
create or replace function public.guard_portal_access_activation() returns trigger language plpgsql set search_path=public,extensions as $$
begin
 if new.access_status='pending' and new.active then raise exception 'Approve this access request before activating the PIN.'; end if;
 if tg_op='UPDATE' and old.access_status='pending' and new.access_status='approved' and not new.active then raise exception 'Approval must activate the PIN.'; end if;
 return new;
end $$;
create trigger guard_portal_access_activation before insert or update on public.portal_pin_credentials for each row execute function public.guard_portal_access_activation();

create or replace function public.approve_portal_access(input_id uuid)
returns boolean language plpgsql set search_path=public,extensions as $$
declare c public.portal_pin_credentials%rowtype;
begin
 perform pg_advisory_xact_lock(hashtext('portal_pin_global_unique'));
 select * into c from portal_pin_credentials where id=input_id for update;
 if c.id is null then raise exception 'Request not found.'; end if;
 if c.access_status<>'pending' then return false; end if;
 update portal_pin_credentials set active=true,access_status='approved',updated_at=now() where id=c.id;
 insert into portal_access_email_queue(credential_id,kind,recipient,subject,body)
 values(c.id,'approved',c.email,'Your Plymouth Township Fire portal access is approved',
 'Hi '||c.display_name||E',\n\nYour access to the Plymouth Township Fire Department portal has been approved. Sign in with the PIN you chose when requesting access.\n\nhttps://fundraisercommand.com/stores/plymouth/login\n\nFundraiser Command') on conflict do nothing;
 return true;
end $$;
revoke all on function public.approve_portal_access(uuid) from public,anon,authenticated;
grant execute on function public.approve_portal_access(uuid) to service_role;

create or replace function public.claim_portal_access_emails(input_credential uuid default null)
returns setof public.portal_access_email_queue language sql set search_path=public as $$
 update portal_access_email_queue set lease_until=now()+interval '5 minutes',attempts=attempts+1
 where id in (select id from portal_access_email_queue where sent_at is null and (lease_until is null or lease_until<now()) and attempts<10 and (input_credential is null or credential_id=input_credential) order by created_at for update skip locked limit 20) returning *;
$$;
revoke all on function public.claim_portal_access_emails(uuid) from public,anon,authenticated;
grant execute on function public.claim_portal_access_emails(uuid) to service_role;

-- Reserve pending and disabled PINs in both existing credential-writing functions.
do $reserve$ declare definition text; signature text; begin
 foreach signature in array array['public.create_portal_pin_credential(uuid,text,text,text)','public.change_portal_pin(uuid,text)'] loop
  select pg_get_functiondef(signature::regprocedure) into definition;
  definition:=replace(definition,'where active and pin_hash = crypt','where pin_hash = crypt');
  execute definition;
 end loop;
end $reserve$;
