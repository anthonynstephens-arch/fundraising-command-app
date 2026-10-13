-- Additional collection access is explicit and read-only; home organization access is unchanged.
create table public.portal_pin_campaign_access (
  credential_id uuid not null references public.portal_pin_credentials(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (credential_id, campaign_id)
);
alter table public.portal_pin_campaign_access enable row level security;
revoke all on public.portal_pin_campaign_access from public, anon, authenticated;
grant select, insert, update, delete on public.portal_pin_campaign_access to service_role;
create index portal_pin_campaign_access_campaign_idx on public.portal_pin_campaign_access(campaign_id);
