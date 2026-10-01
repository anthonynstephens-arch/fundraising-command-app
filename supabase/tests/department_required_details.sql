begin;
-- All fixtures and state transitions are rolled back.
do $$
declare org uuid:=gen_random_uuid(); uid uuid:=gen_random_uuid(); admin_id uuid; v integer; failed boolean;
begin
 select user_id into admin_id from public.platform_admins where is_active limit 1;
 if admin_id is null then raise exception 'Test requires an existing platform administrator.'; end if;
 insert into auth.users(id,email,role) values(uid,'required-details-fixture@example.invalid','authenticated');
 insert into public.organizations(id,name,slug,organization_type,require_details,is_union) values(org,'Required details test fixture','test-required-details-'||org,'fire',true,false);
 insert into public.organization_members(organization_id,user_id,role) values(org,uid,'owner');
 perform set_config('test.details_org',org::text,true);perform set_config('test.details_user',uid::text,true);perform set_config('test.details_admin',admin_id::text,true);
 select details_version into v from public.organizations where id=org;
 failed:=false;
 begin perform public.submit_department_details(org,v,'test');exception when others then failed:=true;end;
 if not failed then raise exception 'Incomplete details were submitted';end if;
 perform public.save_payout_profile(org,'{"method":"paypal","paypalEmail":"agency@example.invalid","is501c3":true,"legalName":"Test nonprofit","ein":"","nonprofitAddress":"123 Fixture St"}',0,'test');
 if not '501(c)(3) legal name, EIN and registered address'=any(public.department_details_missing(org)) then raise exception 'Missing EIN not detected'; end if;
 perform public.save_payout_profile(org,'{"method":"paypal","paypalEmail":"agency@example.invalid","is501c3":true,"legalName":"Test nonprofit","ein":"123456789","nonprofitAddress":"123 Fixture St"}',1,'test');
 insert into public.agency_contacts(organization_id,name,role,email,phone) values(org,'Fixture Contact','Main contact','contact@example.invalid','3135550100');
 if cardinality(public.department_details_missing(org))<>0 then raise exception 'Complete nonunion details rejected';end if;
 select details_version into v from public.organizations where id=org;
 perform public.submit_department_details(org,v,'test');
 failed:=false;
 begin perform public.review_department_details(org,v,'approved','',uid);exception when others then failed:=true;end;
 if not failed then raise exception 'Nonplatform user approved own department';end if;
 perform public.review_department_details(org,v,'approved','Accepted',admin_id);
 if (select details_status from public.organizations where id=org)<>'approved' then raise exception 'Approval not saved';end if;
 perform public.set_department_requirements(org,v,true,true,admin_id);
 if (select details_status from public.organizations where id=org)<>'incomplete' then raise exception 'Changing union status did not revoke approval';end if;
 if cardinality(public.department_details_missing(org))<>3 then raise exception 'Missing union requirements not detected';end if;
 update public.organizations set union_name='Fixture Union',union_local='123' where id=org;
 insert into public.agency_contacts(organization_id,name,role,email) values(org,'Fixture President','Union president','president@example.invalid'),(org,'Fixture Treasurer','Union treasurer','treasurer@example.invalid');
 select details_version into v from public.organizations where id=org;
 perform public.submit_department_details(org,v,'test');
 update public.agency_contacts set phone='3135550101' where organization_id=org and role='Main contact';
 failed:=false;
 begin perform public.review_department_details(org,v,'approved','',admin_id);exception when others then failed:=true;end;
 if not failed then raise exception 'Stale submission approved after contact edit';end if;
 select details_version into v from public.organizations where id=org;
 perform public.submit_department_details(org,v,'test');
 perform public.review_department_details(org,v,'changes_requested','Please correct the contact.',admin_id);
 if (select details_status from public.organizations where id=org)<>'changes_requested' then raise exception 'Request changes failed';end if;
 perform public.submit_department_details(org,v,'test');perform public.review_department_details(org,v,'approved','',admin_id);
 insert into public.campaigns(organization_id,name,slug,campaign_type,status) values(org,'Fixture campaign','test-required-campaign-'||org,'department-store','active');
 perform public.save_payout_profile(org,'{"method":"paypal","paypalEmail":"updated@example.invalid","is501c3":false}',2,'test');
 if (select details_status from public.organizations where id=org)<>'incomplete' then raise exception 'Payment edit did not revoke approval';end if;
 failed:=false;
 begin insert into public.payout_requests(organization_id,campaign_id,requested_by,requested_amount,status) select org,id,uid,100,'requested' from public.campaigns where organization_id=org;exception when others then failed:=true;end;
 if not failed then raise exception 'Payout requested before details approval';end if;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.details_user'),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare org uuid:=current_setting('test.details_org')::uuid; failed boolean:=false;
begin
 if exists(select 1 from public.campaigns where organization_id=org) then raise exception 'Locked department can read campaign data through RLS';end if;
 if not exists(select 1 from public.organizations where id=org) then raise exception 'Department profile is unavailable for setup';end if;
 begin update public.organizations set details_status='approved',require_details=false where id=org;exception when others then failed:=true;end;
 if not failed then raise exception 'Department can bypass approval through direct update';end if;
end $$;
reset role;
do $$
declare org uuid:=current_setting('test.details_org')::uuid; v integer;
begin
 select details_version into v from public.organizations where id=org;
 perform public.submit_department_details(org,v,'test');perform public.review_department_details(org,v,'approved','',current_setting('test.details_admin')::uuid);
end $$;
set local role authenticated;
do $$ begin if not exists(select 1 from public.campaigns where organization_id=current_setting('test.details_org')::uuid) then raise exception 'Approved department cannot read its campaign';end if;end $$;
reset role;
rollback;
select 'PASS: completeness, conditional union and nonprofit requirements, owner-only review, stale submissions, change requests, approval invalidation, payout blocking, RLS denial and approved access; all fixtures rolled back.' as result;
