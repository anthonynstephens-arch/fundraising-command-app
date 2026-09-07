-- Returning an authentication result instead of raising keeps failed-attempt
-- updates committed, so the lockout cannot be bypassed by transaction rollback.
drop function if exists public.portal_pin_login(text, text);

create function public.portal_pin_login(
  input_pin text,
  input_fingerprint text
)
returns table(
  session_token text,
  expires_at timestamptz,
  credential_id uuid,
  organization_id uuid,
  display_name text,
  role text,
  error_message text
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
    return query select
      null::text, null::timestamptz, null::uuid, null::uuid,
      null::text, null::text, 'Too many attempts. Try again in 15 minutes.'::text;
    return;
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

    return query select
      null::text, null::timestamptz, null::uuid, null::uuid,
      null::text, null::text, 'Incorrect PIN.'::text;
    return;
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

  return query select
    raw_token, expiry, matched.id, matched.organization_id,
    matched.display_name, matched.role, null::text;
end;
$$;

revoke all on function public.portal_pin_login(text, text)
  from public, anon, authenticated;
grant execute on function public.portal_pin_login(text, text)
  to service_role;

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

  perform pg_advisory_xact_lock(hashtext('portal_pin_global_unique'));
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
