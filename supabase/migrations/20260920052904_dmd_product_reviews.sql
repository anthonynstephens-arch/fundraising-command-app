create table public.dmd_product_reviews (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_key text not null,
  display_name text not null default '',
  markup numeric(10,2) not null default 0 check (markup >= 0),
  updated_by_identity text,
  updated_at timestamptz not null default now(),
  primary key (organization_id, product_key)
);

alter table public.dmd_product_reviews enable row level security;
revoke all on public.dmd_product_reviews from anon, authenticated;
grant all on public.dmd_product_reviews to service_role;
