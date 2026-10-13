-- Enable public.queue_auth_email as the Send Email Hook in Supabase Auth > Hooks
-- after deploying the auth-email worker. Hook configuration is managed outside SQL.
create table public.auth_email_queue (
 id uuid primary key default gen_random_uuid(), recipient text not null, action text not null,
 token_hash text, token text, created_at timestamptz not null default now(), sent_at timestamptz,
 attempts integer not null default 0, lease_until timestamptz, last_error text
);
alter table public.auth_email_queue enable row level security;
revoke all on public.auth_email_queue from public,anon,authenticated;
grant all on public.auth_email_queue to service_role;
grant usage on schema public to supabase_auth_admin;
grant insert on public.auth_email_queue to supabase_auth_admin;
create policy auth_hook_enqueue on public.auth_email_queue for insert to supabase_auth_admin with check(true);
create function public.queue_auth_email(event jsonb) returns jsonb language plpgsql set search_path='' as $$
declare d jsonb := event->'email_data'; u jsonb := event->'user'; action text := d->>'email_action_type';
begin
 if action='email_change' then
  if nullif(d->>'token_hash_new','') is not null then
   insert into public.auth_email_queue(recipient,action,token_hash,token) values(u->>'email',action,d->>'token_hash_new',d->>'token');
  end if;
  insert into public.auth_email_queue(recipient,action,token_hash,token) values(u->>'new_email',action,d->>'token_hash',coalesce(nullif(d->>'token_new',''),d->>'token'));
 else
  insert into public.auth_email_queue(recipient,action,token_hash,token) values(case when action='email_changed_notification' then coalesce(nullif(d->>'old_email',''),u->>'email') else u->>'email' end,action,nullif(d->>'token_hash',''),nullif(d->>'token',''));
 end if;
 return '{}'::jsonb;
end $$;
revoke all on function public.queue_auth_email(jsonb) from public,anon,authenticated;
grant execute on function public.queue_auth_email(jsonb) to supabase_auth_admin;
create function public.claim_auth_email() returns setof public.auth_email_queue language sql set search_path='' as $$
 update public.auth_email_queue set attempts=attempts+1,lease_until=now()+interval '1 minute'
 where id=(select id from public.auth_email_queue where sent_at is null and attempts<5 and (lease_until is null or lease_until<now()) order by created_at for update skip locked limit 1) returning *;
$$;
revoke all on function public.claim_auth_email() from public,anon,authenticated;
grant execute on function public.claim_auth_email() to service_role;
