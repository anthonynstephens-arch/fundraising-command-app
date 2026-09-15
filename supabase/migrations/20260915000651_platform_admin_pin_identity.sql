create table public.platform_admin_pin_credentials (
  credential_id uuid primary key references public.portal_pin_credentials(id) on delete cascade,
  user_id uuid not null references public.platform_admins(user_id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admin_pin_credentials enable row level security;
revoke all on public.platform_admin_pin_credentials from public, anon, authenticated;
grant select, insert, update, delete on public.platform_admin_pin_credentials to service_role;
comment on table public.platform_admin_pin_credentials is 'Server-managed bindings from verified PIN credentials to existing platform administrators. Never writable through organization management.';
