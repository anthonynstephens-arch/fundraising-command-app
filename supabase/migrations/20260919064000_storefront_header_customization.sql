alter table public.campaigns
  add column if not exists storefront_eyebrow text,
  add column if not exists storefront_supporting_text text,
  add column if not exists storefront_header_message text;

comment on column public.campaigns.storefront_eyebrow is
  'Optional customer-facing label above the storefront campaign title.';
comment on column public.campaigns.storefront_supporting_text is
  'Optional customer-facing supporting line shown in the storefront header.';
comment on column public.campaigns.storefront_header_message is
  'Optional customer-facing announcement shown beneath the storefront navigation header.';
