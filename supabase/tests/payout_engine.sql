begin;
set local role service_role;
do $$
declare org uuid; other_org uuid; result jsonb; blocked boolean:=false; cred uuid;
begin
 select id into org from organizations where slug='plymouth-township-fire-department';
 select id into other_org from organizations where slug='macac';
 perform save_payout_profile(org,'{"method":"ach","accountNumber":"000012345678","routingNumber":"021000021","ein":"123456789"}',0,'test:transaction');
 result:=read_payout_profile(org);
 if result->'details'->>'accountNumber'<>'000012345678' then raise exception 'Encrypted round trip failed'; end if;
 if read_payout_profile(other_org) is not null then raise exception 'Unexpected cross-agency read'; end if;
 if exists(select 1 from organization_payout_profiles where organization_id=org and encode(encrypted_details,'escape') like '%000012345678%') then raise exception 'Plaintext stored'; end if;
 begin perform save_payout_profile(org,'{}',0,'test:stale');exception when others then blocked:=true;end;
 if not blocked then raise exception 'Stale profile write accepted'; end if;
 if has_table_privilege('authenticated','public.organization_payout_profiles','SELECT') or has_function_privilege('anon','public.read_payout_profile(uuid)','EXECUTE') or has_schema_privilege('anon','payout_private','USAGE') then raise exception 'Sensitive data exposed'; end if;
 cred:=request_department_access(other_org,'Shared access verification','shared-verification@example.invalid',lpad((floor(random()*90000000)+10000000)::text,8,'0'),'shared-test',array['owner@example.invalid']);
 if not exists(select 1 from portal_pin_credentials where id=cred and organization_id=other_org and not active) then raise exception 'Generic department request failed'; end if;
 perform approve_portal_access(cred);
 if not exists(select 1 from portal_access_email_queue where credential_id=cred and kind='approved' and body like '%/departments/macac/login%') then raise exception 'Wrong agency approval link'; end if;
 update organizations set access_requests_enabled=false where id=other_org;
 blocked:=false;
 begin perform request_department_access(other_org,'Disabled verification','disabled@example.invalid','81920364','disabled-test',array[]::text[]);exception when others then blocked:=true;end;
 if not blocked then raise exception 'Disabled access requests accepted';end if;
end $$;
rollback;
