create extension if not exists pgcrypto with schema extensions;

alter table public.orders
  add column if not exists customer_last_name text;

create table if not exists public.portal_pin_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('owner', 'admin', 'manager', 'viewer')),
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_pin_sessions (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references public.portal_pin_credentials(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.portal_pin_login_attempts (
  fingerprint_hash text primary key,
  failed_count integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_pin_login_events (
  id bigint generated always as identity primary key,
  credential_id uuid not null references public.portal_pin_credentials(id) on delete cascade,
  display_name text not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role text not null,
  logged_in_at timestamptz not null default now()
);

create index if not exists portal_pin_credentials_org_idx
  on public.portal_pin_credentials(organization_id, active);
create index if not exists portal_pin_sessions_expiry_idx
  on public.portal_pin_sessions(expires_at);
create index if not exists portal_pin_login_events_credential_idx
  on public.portal_pin_login_events(credential_id, logged_in_at desc);

alter table public.portal_pin_credentials enable row level security;
alter table public.portal_pin_sessions enable row level security;
alter table public.portal_pin_login_attempts enable row level security;
alter table public.portal_pin_login_events enable row level security;

revoke all on public.portal_pin_credentials from anon, authenticated;
revoke all on public.portal_pin_sessions from anon, authenticated;
revoke all on public.portal_pin_login_attempts from anon, authenticated;
revoke all on public.portal_pin_login_events from anon, authenticated;

create or replace function public.create_portal_pin_credential(
  input_organization_id uuid,
  input_display_name text,
  input_role text,
  input_pin text
)
returns uuid
language plpgsql
set search_path = public, extensions
as $$
declare
  new_id uuid;
begin
  if length(trim(input_display_name)) < 2 then
    raise exception 'Enter a name for this PIN.' using errcode = 'P0001';
  end if;
  if input_role not in ('owner', 'admin', 'manager', 'viewer') then
    raise exception 'Invalid access role.' using errcode = 'P0001';
  end if;
  if input_pin !~ '^[0-9]{4,8}$' then
    raise exception 'PIN must be 4 to 8 digits.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.portal_pin_credentials
    where active and pin_hash = crypt(input_pin, pin_hash)
  ) then
    raise exception 'That PIN is already in use.' using errcode = 'P0001';
  end if;

  insert into public.portal_pin_credentials(
    organization_id, display_name, role, pin_hash
  )
  values (
    input_organization_id,
    trim(input_display_name),
    input_role,
    crypt(input_pin, gen_salt('bf', 10))
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.portal_pin_login(
  input_pin text,
  input_fingerprint text
)
returns table(
  session_token text,
  expires_at timestamptz,
  credential_id uuid,
  organization_id uuid,
  display_name text,
  role text
)
language plpgsql
set search_path = public, extensions
as $$
declare
  attempt_row public.portal_pin_login_attempts%rowtype;
  matched public.portal_pin_credentials%rowtype;
  raw_token text;
  expiry timestamptz := now() + interval '30 days';
  fingerprint_digest text := encode(
    digest(coalesce(input_fingerprint, 'unknown'), 'sha256'),
    'hex'
  );
begin
  select * into attempt_row
  from public.portal_pin_login_attempts
  where fingerprint_hash = fingerprint_digest;

  if attempt_row.locked_until is not null and attempt_row.locked_until > now() then
    raise exception 'Too many attempts. Try again in 15 minutes.' using errcode = 'P0001';
  end if;

  select * into matched
  from public.portal_pin_credentials
  where active and pin_hash = crypt(input_pin, pin_hash)
  order by created_at
  limit 1;

  if matched.id is null then
    insert into public.portal_pin_login_attempts(
      fingerprint_hash, failed_count, locked_until, updated_at
    )
    values (fingerprint_digest, 1, null, now())
    on conflict (fingerprint_hash) do update
    set
      failed_count = case
        when public.portal_pin_login_attempts.updated_at < now() - interval '15 minutes'
          then 1
        else public.portal_pin_login_attempts.failed_count + 1
      end,
      locked_until = case
        when public.portal_pin_login_attempts.failed_count >= 4
          and public.portal_pin_login_attempts.updated_at >= now() - interval '15 minutes'
          then now() + interval '15 minutes'
        else null
      end,
      updated_at = now();
    raise exception 'Incorrect PIN.' using errcode = 'P0001';
  end if;

  delete from public.portal_pin_login_attempts
  where fingerprint_hash = fingerprint_digest;

  raw_token := encode(gen_random_bytes(32), 'hex');

  insert into public.portal_pin_sessions(token_hash, credential_id, expires_at)
  values (encode(digest(raw_token, 'sha256'), 'hex'), matched.id, expiry);

  insert into public.portal_pin_login_events(
    credential_id, display_name, organization_id, role
  )
  values (matched.id, matched.display_name, matched.organization_id, matched.role);

  return query
  select
    raw_token,
    expiry,
    matched.id,
    matched.organization_id,
    matched.display_name,
    matched.role;
end;
$$;

revoke all on function public.create_portal_pin_credential(uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function public.portal_pin_login(text, text)
  from public, anon, authenticated;
grant execute on function public.create_portal_pin_credential(uuid, text, text, text)
  to service_role;
grant execute on function public.portal_pin_login(text, text)
  to service_role;
