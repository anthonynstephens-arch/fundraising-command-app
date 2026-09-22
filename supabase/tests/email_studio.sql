begin;
set local role service_role;
do $$
declare org uuid; v integer; event uuid; token uuid;
begin
 insert into public.organizations(name,slug,organization_type,is_active) values('Email workflow test','email-test-'||gen_random_uuid(),'fire_department',true) returning id into org;
 if has_table_privilege('anon','public.portal_email_templates','SELECT') or has_table_privilege('authenticated','public.portal_notification_emails','SELECT') or has_function_privilege('authenticated','public.command_center_snapshot()','EXECUTE') then raise exception 'Browser grants are unsafe'; end if;
 perform public.save_payout_profile(org,'{"method":"check"}',0,'test');
 if (select review_status from public.organization_payout_profiles where organization_id=org)<>'pending' then raise exception 'Missing review'; end if;
 perform public.review_payout_profile(org,1,'approved','Reviewed',gen_random_uuid());
 if (select review_status from public.organization_payout_profiles where organization_id=org)<>'approved' then raise exception 'Review not stored'; end if;
 perform public.save_payout_profile(org,'{"method":"paypal"}',1,'test');
 if (select review_status from public.organization_payout_profiles where organization_id=org)<>'pending' then raise exception 'Update failed to reset approval'; end if;
 begin perform public.review_payout_profile(org,1,'approved','',gen_random_uuid());raise exception 'Stale approval accepted';exception when others then if sqlerrm='Stale approval accepted' then raise; end if;end;
 v:=public.save_email_template('new_sales','{"subject":"draft"}',0,false,null);
 if (select published from public.portal_email_templates where category='new_sales') is not null then raise exception 'Draft published';end if;
 v:=public.save_email_template('new_sales','{"subject":"published"}',v,true,null);
 v:=public.save_email_template('new_sales','{"subject":"new draft"}',v,false,null);
 if (select published->>'subject' from public.portal_email_templates where category='new_sales')<>'published' then raise exception 'Draft overwrote live template';end if;
 begin perform public.save_email_template('new_sales','{}',0,true,null);raise exception 'Stale template accepted';exception when others then if sqlerrm='Stale template accepted' then raise;end if;end;
 insert into public.portal_notification_events(organization_id,event_key,category,title,body,href) values(org,'test-email-queue-'||gen_random_uuid(),'new_sales','Test','Test','/portal') returning id into event;
 insert into public.portal_notification_emails(event_id,organization_id,recipient,identity_type,identity_id) values(event,org,'test@example.invalid','pin',gen_random_uuid());
 select lease_token into token from public.claim_notification_emails() where event_id=event;
 if token is null then raise exception 'Queue not claimed';end if;
 if exists(select 1 from public.claim_notification_emails() where event_id=event) then raise exception 'Queue claimed twice';end if;
 if public.command_center_snapshot()->'agencies' is null then raise exception 'Snapshot unavailable';end if;
end $$;
rollback;
