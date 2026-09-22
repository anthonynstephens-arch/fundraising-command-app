-- Transactional workflow test: leaves no user, session, or email jobs behind.
begin;
set local role service_role;
do $$
declare cid uuid; p text; r record; raised boolean;
begin
 p:=lpad((floor(random()*90000000)+10000000)::text,8,'0');
 cid:=public.request_plymouth_access('Access workflow verification','access-verification@example.invalid',p,'verification-'||gen_random_uuid(),array['owner@example.invalid']);
 if not exists(select 1 from portal_pin_credentials where id=cid and active=false and access_status='pending' and must_change_pin=false) then raise exception 'Pending state failed'; end if;
 if exists(select 1 from portal_pin_login(p,'verification-login') where session_token is not null) then raise exception 'Pending PIN logged in'; end if;
 if not exists(select 1 from portal_access_email_queue where credential_id=cid and kind='requested' and recipient='owner@example.invalid') then raise exception 'Admin notification missing'; end if;
 raised:=false;
 begin update portal_pin_credentials set active=true where id=cid; exception when others then raised:=true; end;
 if not raised then raise exception 'Legacy enable bypassed approval'; end if;
 raised:=false;
 begin perform create_portal_pin_credential((select organization_id from portal_pin_credentials where id=cid),'Duplicate verification','viewer',p); exception when others then raised:=true; end;
 if not raised then raise exception 'Pending PIN was not reserved'; end if;
 perform approve_portal_access(cid);
 if not exists(select 1 from portal_pin_login(p,'verification-approved') where session_token is not null) then raise exception 'Approved login failed'; end if;
 perform approve_portal_access(cid);
 if (select count(*) from portal_access_email_queue where credential_id=cid and kind='approved')<>1 then raise exception 'Approval email duplication'; end if;
 if has_function_privilege('anon','public.request_plymouth_access(text,text,text,text,text[])','EXECUTE') or has_table_privilege('anon','public.portal_access_email_queue','SELECT') then raise exception 'Anonymous access exposed'; end if;
end $$;
rollback;
