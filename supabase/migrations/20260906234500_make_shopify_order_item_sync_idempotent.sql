alter table public.order_items
  add constraint order_items_order_line_unique
  unique (order_id, shopify_line_item_id);
