create table public.organization_graphics (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, name text not null check (length(name) between 1 and 180), url text not null check(length(url)<2049), created_by text, created_at timestamptz not null default now(), unique(organization_id,url));
create index organization_graphics_org_created_idx on public.organization_graphics(organization_id,created_at desc);
alter table public.organization_graphics enable row level security;
revoke all on public.organization_graphics from anon,authenticated;
grant select,insert,update,delete on public.organization_graphics to service_role;
