-- Membership policies call these predicates on organization_members itself.
-- Private, self-scoped lookups avoid recursive RLS without exposing arbitrary members.
create function private.current_user_org_member(target_org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and exists(select 1 from public.organization_members m where m.organization_id=target_org and m.user_id=(select auth.uid()));
$$;
create function private.current_user_org_role(target_org uuid,allowed public.org_role[]) returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and exists(select 1 from public.organization_members m where m.organization_id=target_org and m.user_id=(select auth.uid()) and m.role=any(allowed));
$$;
revoke all on function private.current_user_org_member(uuid),private.current_user_org_role(uuid,public.org_role[]) from public,anon,authenticated;
grant execute on function private.current_user_org_member(uuid),private.current_user_org_role(uuid,public.org_role[]) to authenticated,service_role;
create or replace function public.is_org_member(target_org uuid) returns boolean language sql stable set search_path='' as $$
 select case when (select auth.uid()) is null then false else private.current_user_org_member(target_org) end;
$$;
create or replace function public.has_org_role(target_org uuid,allowed public.org_role[]) returns boolean language sql stable set search_path='' as $$
 select case when (select auth.uid()) is null then false else private.current_user_org_role(target_org,allowed) end;
$$;
