create or replace function public.set_collection_assignment(kind text, identity uuid, campaign uuid, assigned boolean, recipient_email text)
returns boolean language plpgsql set search_path=public as $$
declare changed integer;
begin
 if kind='pin' then
  if assigned then insert into portal_pin_campaign_access values(identity,campaign,now()) on conflict do nothing;
  else delete from portal_pin_campaign_access where credential_id=identity and campaign_id=campaign; end if;
 elsif kind='user' then
  if assigned then insert into portal_user_campaign_access values(identity,campaign,now()) on conflict do nothing;
  else delete from portal_user_campaign_access where user_id=identity and campaign_id=campaign; end if;
 else raise exception 'Invalid identity'; end if;
 get diagnostics changed = row_count;
 if not assigned then update collection_assignment_emails set cancelled_at=now() where identity_type=kind and identity_id=identity and campaign_id=campaign and sent_at is null; end if;
 if assigned and changed>0 then
  insert into collection_assignment_emails(identity_type,identity_id,campaign_id,recipient) values(kind,identity,campaign,coalesce(trim(recipient_email),''));
 end if;
 return changed>0;
end $$;
revoke all on function public.set_collection_assignment(text,uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.set_collection_assignment(text,uuid,uuid,boolean,text) to service_role;
create or replace function public.claim_collection_assignment_emails() returns setof public.collection_assignment_emails language sql set search_path=public as $$
 update collection_assignment_emails set attempts=attempts+1,lease_until=now()+interval '5 minutes'
 where id in (select id from collection_assignment_emails where sent_at is null and cancelled_at is null and nullif(trim(recipient),'') is not null and attempts<5 and (lease_until is null or lease_until<now()) order by created_at for update skip locked limit 10) returning *;
$$;
revoke all on function public.claim_collection_assignment_emails() from public,anon,authenticated;
grant execute on function public.claim_collection_assignment_emails() to service_role;

create function public.set_pin_notification_email(identity uuid,email_address text) returns void language plpgsql set search_path=public as $$
begin
 update portal_pin_credentials set email=lower(trim(email_address)) where id=identity;
 if not found then raise exception 'PIN user not found'; end if;
 update collection_assignment_emails set recipient=lower(trim(email_address)),attempts=0,last_error=null,lease_until=null
 where identity_type='pin' and identity_id=identity and sent_at is null and cancelled_at is null;
end $$;
revoke all on function public.set_pin_notification_email(uuid,text) from public,anon,authenticated;
grant execute on function public.set_pin_notification_email(uuid,text) to service_role;
