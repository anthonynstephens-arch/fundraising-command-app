-- PIN data is only accessed by server-side code with the service role.
-- Explicit deny policies document and enforce that boundary for browser roles.
create policy portal_pin_credentials_deny_browser_access
  on public.portal_pin_credentials
  for all to anon, authenticated
  using (false)
  with check (false);

create policy portal_pin_sessions_deny_browser_access
  on public.portal_pin_sessions
  for all to anon, authenticated
  using (false)
  with check (false);

create policy portal_pin_login_attempts_deny_browser_access
  on public.portal_pin_login_attempts
  for all to anon, authenticated
  using (false)
  with check (false);

create policy portal_pin_login_events_deny_browser_access
  on public.portal_pin_login_events
  for all to anon, authenticated
  using (false)
  with check (false);

create index if not exists portal_pin_sessions_credential_idx
  on public.portal_pin_sessions(credential_id);

create index if not exists portal_pin_login_events_organization_idx
  on public.portal_pin_login_events(organization_id);

-- Keep one non-partial unique index for PostgREST upserts and remove the
-- redundant constraint-backed index introduced by the first sync migration.
create unique index if not exists order_items_order_line_upsert_unique
  on public.order_items(order_id, shopify_line_item_id);

alter table public.order_items
  drop constraint if exists order_items_order_line_unique;
