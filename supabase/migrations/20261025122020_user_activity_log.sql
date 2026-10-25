create table public.portal_activity_log (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 actor_id text not null, actor_name text not null, auth_type text not null check(auth_type in ('account','pin')),
 organization_id uuid, kind text not null check(kind in ('page_view','download','request')),
 path text not null, detail text not null default '', context text not null default '',
 source text not null default 'browser'
);
alter table public.portal_activity_log enable row level security;
revoke all on public.portal_activity_log from public, anon, authenticated;
grant select, insert on public.portal_activity_log to service_role;
revoke update, delete, truncate on public.portal_activity_log from service_role;
create index portal_activity_created_idx on public.portal_activity_log (created_at desc,id desc);
create index portal_activity_actor_idx on public.portal_activity_log (actor_id,created_at desc);
create index portal_activity_kind_idx on public.portal_activity_log (kind,created_at desc);