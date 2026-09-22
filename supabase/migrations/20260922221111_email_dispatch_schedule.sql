create function public.dispatch_portal_email() returns bigint language sql set search_path=public as $$
 select net.http_post(
 url:='https://www.fundraisercommand.com/api/cron/notification-emails',
 headers:=jsonb_build_object('Content-Type','application/json','x-dispatch-token',dispatch_token),
 body:='{}'::jsonb,timeout_milliseconds:=60000
 ) from portal_push_config where id=true and (
 exists(select 1 from portal_notification_events where email_enqueued_at is null) or
 exists(select 1 from portal_notification_emails where status in ('queued','sending')));
$$;
revoke all on function public.dispatch_portal_email() from public,anon,authenticated;
grant execute on function public.dispatch_portal_email() to service_role;
select cron.schedule('portal-email-dispatch','*/5 * * * *',$job$select public.dispatch_portal_email();$job$);
