create or replace function public.delete_organization_and_data(p_organization_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  -- Orders and payouts intentionally restrict parent deletion. Remove them first;
  -- their dependent rows already use cascade or set-null foreign keys.
  delete from public.payouts where organization_id = p_organization_id;
  delete from public.orders where organization_id = p_organization_id;
  delete from public.organizations where id = p_organization_id;
  get diagnostics deleted_count = row_count;
  return deleted_count = 1;
end;
$$;

revoke all on function public.delete_organization_and_data(uuid) from public;
revoke all on function public.delete_organization_and_data(uuid) from anon;
revoke all on function public.delete_organization_and_data(uuid) from authenticated;
grant execute on function public.delete_organization_and_data(uuid) to service_role;
