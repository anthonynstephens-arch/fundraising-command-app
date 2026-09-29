create table public.dmd_sign_proof_selections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  front_proof smallint not null check (front_proof between 1 and 10),
  back_proof smallint not null check (back_proof between 1 and 10),
  selected_by_identity text not null,
  selected_by_name text not null,
  created_at timestamptz not null default now(),
  constraint dmd_sign_proof_distinct_sides check (front_proof <> back_proof)
);

create index dmd_sign_proof_selections_org_created_idx
  on public.dmd_sign_proof_selections (organization_id, created_at desc);

alter table public.dmd_sign_proof_selections enable row level security;
revoke all on public.dmd_sign_proof_selections from anon, authenticated;
grant all on public.dmd_sign_proof_selections to service_role;
