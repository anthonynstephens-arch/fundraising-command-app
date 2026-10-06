-- Route every designer event through the private designer portal before dispatch.
create or replace function public.route_designer_notification() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
 if exists(select 1 from public.organizations where id=new.organization_id and organization_type='designer' and slug='britton-mane') then
  new.href:='/designers/britton-mane'||case new.category when 'new_sales' then '#sales' when 'payout_updates' then '#payments' else '#overview' end;
  if new.category='new_sales' then new.title:='New apparel sale';new.body:='Your included apparel received a new order. Open your designer portal to view the sale.';end if;
 end if;
 return new;
end $$;
revoke all on function public.route_designer_notification() from public,anon,authenticated;
create trigger designer_notification_route before insert on public.portal_notification_events for each row execute function public.route_designer_notification();
update public.portal_notification_events set href='/designers/britton-mane'||case category when 'new_sales' then '#sales' when 'payout_updates' then '#payments' else '#overview' end where organization_id in(select id from public.organizations where organization_type='designer' and slug='britton-mane');
