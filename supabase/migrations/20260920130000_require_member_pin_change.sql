alter table public.portal_pin_credentials
  add column if not exists must_change_pin boolean not null default true;

-- Platform administrator PINs are managed separately and are not issued member PINs.
update public.portal_pin_credentials as credential
set must_change_pin = false
where exists (
  select 1
  from public.platform_admin_pin_credentials as platform_pin
  where platform_pin.credential_id = credential.id
);

create or replace function public.change_portal_pin(
  input_credential_id uuid,
  input_new_pin text
)
returns void
language plpgsql
set search_path = public, extensions
as $$
begin
  if input_new_pin !~ '^[0-9]{4,8}$' then
    raise exception 'PIN must be 4 to 8 digits.' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('portal_pin_global_unique'));

  if not exists (
    select 1
    from public.portal_pin_credentials
    where id = input_credential_id and active
  ) then
    raise exception 'This PIN access is no longer active.' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.portal_pin_credentials
    where active and pin_hash = crypt(input_new_pin, pin_hash)
  ) then
    raise exception 'Choose a PIN you have not used before.' using errcode = 'P0001';
  end if;

  update public.portal_pin_credentials
  set
    pin_hash = crypt(input_new_pin, gen_salt('bf', 10)),
    must_change_pin = false,
    updated_at = now()
  where id = input_credential_id and active;
end;
$$;

revoke all on function public.change_portal_pin(uuid, text)
  from public, anon, authenticated;
grant execute on function public.change_portal_pin(uuid, text)
  to service_role;

