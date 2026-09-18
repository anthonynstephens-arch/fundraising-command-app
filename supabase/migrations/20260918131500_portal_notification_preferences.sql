create table if not exists public.portal_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  identity_type text not null check (identity_type in ('user', 'pin')),
  identity_id uuid not null,
  email_enabled boolean not null default true,
  browser_enabled boolean not null default false,
  in_app_enabled boolean not null default true,
  new_sales boolean not null default true,
  payout_updates boolean not null default true,
  campaign_milestones boolean not null default true,
  sync_issues boolean not null default true,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, identity_type, identity_id)
);

alter table public.portal_notification_preferences enable row level security;

comment on table public.portal_notification_preferences is
  'Service-route managed notification and onboarding preferences for email and PIN portal identities.';
