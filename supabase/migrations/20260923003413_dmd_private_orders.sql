-- DMD portal orders checked out without a Shopify B2B login still belong in
-- its private portal history. Shopify company orders are read live separately.
create table public.dmd_private_orders (
  shopify_order_id text primary key,
  organization_id uuid not null references public.organizations(id),
  order_data jsonb not null,
  updated_at timestamptz not null default now()
);
create index dmd_private_orders_org_idx on public.dmd_private_orders(organization_id, updated_at desc);
alter table public.dmd_private_orders enable row level security;
revoke all on public.dmd_private_orders from anon, authenticated;
