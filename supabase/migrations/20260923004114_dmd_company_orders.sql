-- Signed Shopify order webhooks include company.id; store only orders for DMD.
create table public.dmd_company_orders (
  shopify_order_id text primary key,
  organization_id uuid not null references public.organizations(id),
  order_data jsonb not null,
  updated_at timestamptz not null default now()
);
create index dmd_company_orders_org_idx on public.dmd_company_orders(organization_id, updated_at desc);
alter table public.dmd_company_orders enable row level security;
revoke all on public.dmd_company_orders from anon, authenticated;
