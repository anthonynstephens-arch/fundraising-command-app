alter table public.orders
  add column if not exists customer_phone text,
  add column if not exists shipping_first_name text,
  add column if not exists shipping_last_name text,
  add column if not exists shipping_company text,
  add column if not exists shipping_address1 text,
  add column if not exists shipping_address2 text,
  add column if not exists shipping_city text,
  add column if not exists shipping_province text,
  add column if not exists shipping_postal_code text,
  add column if not exists shipping_country text;

create or replace function public.import_department_order(target_org uuid, payload jsonb)
returns integer language plpgsql security invoker set search_path=public as $$
declare
  line jsonb; cp public.campaign_products%rowtype; existing public.order_items%rowtype;
  order_key uuid; first_campaign uuid; line_key text; product_key text; variant_key text;
  matches uuid[]; matched jsonb := '[]'; qty integer; remaining integer; price numeric;
  contribution numeric; refunded numeric; imported integer := 0; state public.orders.status%type;
  address jsonb; first_name text; last_name text; email_address text;
begin
  perform 1 from organizations where id=target_org and is_active for share;
  if not found then raise exception 'Department not found'; end if;
  if not public.order_in_department_period(target_org,(payload->>'createdAt')::timestamptz) then return 0; end if;
  perform pg_advisory_xact_lock(hashtext('shopify-order:'||(payload->>'id')));
  for line in select value from jsonb_array_elements(payload->'lines') loop
    line_key := regexp_replace(line->>'id','^.*/','');
    product_key := regexp_replace(line->'product'->>'id','^.*/','');
    variant_key := regexp_replace(line->'variant'->>'id','^.*/','');
    select i.* into existing from order_items i join orders o on o.id=i.order_id
      where o.shopify_order_id=regexp_replace(payload->>'id','^.*/','') and i.shopify_line_item_id=line_key;
    if existing.campaign_product_id is not null then
      select p.* into cp from campaign_products p join campaigns c on c.id=p.campaign_id
        where p.id=existing.campaign_product_id and c.organization_id=target_org;
      if not found then
        if exists(select 1 from campaign_products p join campaigns c on c.id=p.campaign_id
          where c.organization_id=target_org and
            ((variant_key is not null and regexp_replace(p.shopify_variant_id,'^.*/','')=variant_key)
            or (p.shopify_variant_id is null and product_key is not null and regexp_replace(p.shopify_product_id,'^.*/','')=product_key))) then
          raise exception 'Order % is already credited to another department with the same product. Resolve the duplicate collection assignment before importing.',payload->>'name';
        end if;
        continue;
      end if;
    else
      select array_agg(p.id order by p.id) into matches from campaign_products p
      join campaigns c on c.id=p.campaign_id
      where c.organization_id=target_org and
        ((variant_key is not null and regexp_replace(p.shopify_variant_id,'^.*/','')=variant_key)
        or (p.shopify_variant_id is null and product_key is not null and regexp_replace(p.shopify_product_id,'^.*/','')=product_key));
      if coalesce(array_length(matches,1),0)=0 then continue; end if;
      if array_length(matches,1)>1 then raise exception 'Order % has an item assigned to multiple funds in this department. Resolve duplicate product assignments before importing.',payload->>'name'; end if;
      select * into cp from campaign_products where id=matches[1];
    end if;
    first_campaign := coalesce(first_campaign,cp.campaign_id);
    matched := matched || jsonb_build_array(line || jsonb_build_object('campaignProductId',cp.id));
  end loop;
  if first_campaign is null then return 0; end if;
  state := case when payload->>'cancelledAt' is not null then 'cancelled'
    when payload->>'displayFinancialStatus'='PAID' then 'paid'
    when payload->>'displayFinancialStatus'='PARTIALLY_REFUNDED' then 'partially_refunded'
    when payload->>'displayFinancialStatus'='REFUNDED' then 'refunded' else 'pending' end;
  address := coalesce(payload->'shippingAddress',payload->'billingAddress','{}'::jsonb);
  first_name := coalesce(nullif(address->>'firstName',''),nullif(payload->'customer'->>'firstName',''));
  last_name := coalesce(nullif(address->>'lastName',''),nullif(payload->'customer'->>'lastName',''));
  email_address := coalesce(nullif(payload->>'email',''),nullif(payload->'customer'->'defaultEmailAddress'->>'emailAddress',''));
  insert into orders(organization_id,campaign_id,shopify_order_id,shopify_order_number,
    customer_first_name,customer_last_name,customer_last_initial,customer_email,customer_phone,
    shipping_first_name,shipping_last_name,shipping_company,shipping_address1,shipping_address2,
    shipping_city,shipping_province,shipping_postal_code,shipping_country,
    currency,subtotal,total,status,placed_at,fulfillment_status)
  values(target_org,first_campaign,regexp_replace(payload->>'id','^.*/',''),payload->>'name',
    first_name,last_name,case when last_name is null then null else upper(left(last_name,1))||'.' end,
    email_address,coalesce(nullif(payload->>'phone',''),nullif(address->>'phone','')),
    address->>'firstName',address->>'lastName',address->>'company',address->>'address1',address->>'address2',
    address->>'city',coalesce(nullif(address->>'province',''),nullif(address->>'provinceCode','')),
    address->>'zip',coalesce(nullif(address->>'country',''),nullif(address->>'countryCodeV2','')),
    payload->>'currencyCode',
    coalesce((payload->'subtotalPriceSet'->'shopMoney'->>'amount')::numeric,0),
    coalesce((payload->'totalPriceSet'->'shopMoney'->>'amount')::numeric,0),state,(payload->>'createdAt')::timestamptz,
    lower(payload->>'displayFulfillmentStatus'))
  on conflict(shopify_order_id) do update set
    customer_first_name=excluded.customer_first_name,customer_last_name=excluded.customer_last_name,
    customer_last_initial=excluded.customer_last_initial,customer_email=excluded.customer_email,
    customer_phone=excluded.customer_phone,shipping_first_name=excluded.shipping_first_name,
    shipping_last_name=excluded.shipping_last_name,shipping_company=excluded.shipping_company,
    shipping_address1=excluded.shipping_address1,shipping_address2=excluded.shipping_address2,
    shipping_city=excluded.shipping_city,shipping_province=excluded.shipping_province,
    shipping_postal_code=excluded.shipping_postal_code,shipping_country=excluded.shipping_country,
    status=excluded.status,fulfillment_status=excluded.fulfillment_status,updated_at=now()
  returning id into order_key;
  for line in select value from jsonb_array_elements(matched) loop
    select * into cp from campaign_products where id=(line->>'campaignProductId')::uuid;
    line_key := regexp_replace(line->>'id','^.*/','');
    select * into existing from order_items where order_id=order_key and shopify_line_item_id=line_key for update;
    qty := (line->>'quantity')::integer;
    if qty <= 0 then continue; end if;
    remaining := case when state='refunded' then 0 else greatest(0,least(qty,(line->>'currentQuantity')::integer)) end;
    price := (line->'discountedUnitPriceAfterAllDiscountsSet'->'shopMoney'->>'amount')::numeric;
    contribution := case when existing.campaign_product_id is not null then existing.contribution_amount
      when cp.contribution_type='percentage' then round(price*qty*cp.contribution_value/100,2)
      else round(qty*cp.contribution_value,2) end;
    refunded := round(contribution*(qty-remaining)/qty,2);
    insert into order_items(order_id,campaign_product_id,shopify_line_item_id,shopify_product_id,shopify_variant_id,
      title,variant_title,sku,quantity,unit_price,contribution_amount,refunded_contribution_amount,refunded_merchandise_amount)
    values(order_key,cp.id,line_key,regexp_replace(line->'product'->>'id','^.*/',''),regexp_replace(line->'variant'->>'id','^.*/',''),
      line->>'title',line->>'variantTitle',line->>'sku',qty,price,contribution,refunded,round(price*(qty-remaining),2))
    on conflict(order_id,shopify_line_item_id) do update set
      campaign_product_id=coalesce(order_items.campaign_product_id,excluded.campaign_product_id),
      contribution_amount=case when order_items.campaign_product_id is null then excluded.contribution_amount else order_items.contribution_amount end,
      refunded_contribution_amount=greatest(order_items.refunded_contribution_amount,excluded.refunded_contribution_amount),
      refunded_merchandise_amount=greatest(order_items.refunded_merchandise_amount,excluded.refunded_merchandise_amount);
    imported := imported+1;
  end loop;
  return imported;
end; $$;
revoke all on function public.import_department_order(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.import_department_order(uuid,jsonb) to service_role;
