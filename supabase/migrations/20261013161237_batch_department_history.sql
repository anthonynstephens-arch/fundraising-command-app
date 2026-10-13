-- Preserve the existing attribution checks and idempotency while reducing RPC round trips.
create function public.import_department_orders(target_org uuid,payloads jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare payload jsonb; line_count integer; imported integer:=0; items integer:=0;
begin
 if jsonb_typeof(payloads)<>'array' or jsonb_array_length(payloads)>20 then raise exception 'Invalid import batch'; end if;
 for payload in select value from jsonb_array_elements(payloads) loop
  line_count:=public.import_department_order(target_org,payload);
  if line_count>0 then imported:=imported+1; items:=items+line_count; end if;
 end loop;
 return jsonb_build_object('imported',imported,'items',items);
end $$;
revoke all on function public.import_department_orders(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.import_department_orders(uuid,jsonb) to service_role;
