import { createAdminClient } from '@/lib/supabase/admin'
import {
  stripShopifyGid,
  toShopifyGid,
} from '@/lib/shopify/admin'

function money(value: any) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

function mapOrderStatus(order: any) {
  if (order.cancelled_at) return 'cancelled'

  const status = String(
    order.financial_status || ''
  ).toLowerCase()

  if (status === 'paid') return 'paid'
  if (status === 'refunded') return 'refunded'
  if (status === 'partially_refunded') {
    return 'partially_refunded'
  }

  return 'pending'
}

async function findCampaignProduct(
  productId: any,
  variantId: any
) {
  const supabase = createAdminClient()

  const productNumeric = stripShopifyGid(productId)
  const variantNumeric = stripShopifyGid(variantId)

  const productGid = toShopifyGid(
    'Product',
    productNumeric
  )

  const variantGid = toShopifyGid(
    'ProductVariant',
    variantNumeric
  )

  if (variantNumeric) {
    const { data: variantMatch } = await supabase
      .from('campaign_products')
      .select(`
        id,
        campaign_id,
        contribution_type,
        contribution_value,
        shopify_product_id,
        shopify_variant_id
      `)
      .in('shopify_variant_id', [
        variantNumeric,
        variantGid,
      ])
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (variantMatch) {
      return variantMatch
    }
  }

  if (productNumeric) {
    const { data: productMatch } = await supabase
      .from('campaign_products')
      .select(`
        id,
        campaign_id,
        contribution_type,
        contribution_value,
        shopify_product_id,
        shopify_variant_id
      `)
      .in('shopify_product_id', [
        productNumeric,
        productGid,
      ])
      .is('shopify_variant_id', null)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (productMatch) {
      return productMatch
    }
  }

  return null
}

function calculateContribution(
  campaignProduct: any,
  quantity: number,
  unitPrice: number
) {
  if (!campaignProduct) return 0

  const value = money(
    campaignProduct.contribution_value
  )

  if (
    campaignProduct.contribution_type ===
    'percentage'
  ) {
    return Number(
      (
        unitPrice *
        quantity *
        (value / 100)
      ).toFixed(2)
    )
  }

  return Number(
    (value * quantity).toFixed(2)
  )
}

export async function importShopifyOrder(
  payload: any,
  shopDomain: string
) {
  const supabase = createAdminClient()

  const { data: store } = await supabase
    .from('shopify_stores')
    .select('id,organization_id')
    .eq('admin_domain', shopDomain)
    .eq('is_active', true)
    .maybeSingle()

  if (!store) {
    throw new Error(
      `No active Shopify store mapped to ${shopDomain}`
    )
  }

  const lineItems =
    payload.line_items ||
    payload.lineItems ||
    []

  const mappedLines = []

  for (const line of lineItems) {
    const productId =
      line.product_id ??
      line.productId ??
      stripShopifyGid(line.product?.id)

    const variantId =
      line.variant_id ??
      line.variantId ??
      stripShopifyGid(line.variant?.id)

    const campaignProduct =
      await findCampaignProduct(
        productId,
        variantId
      )

    const quantity = Number(
      line.quantity || 0
    )

    const unitPrice = money(
      line.price ??
        line.originalUnitPriceSet?.shopMoney
          ?.amount ??
        line.originalUnitPrice
    )

    mappedLines.push({
      line,
      productId,
      variantId,
      campaignProduct,
      quantity,
      unitPrice,
    })
  }

  const campaignIds = [
    ...new Set(
      mappedLines
        .map(
          (item) =>
            item.campaignProduct?.campaign_id
        )
        .filter(Boolean)
    ),
  ]

  const campaignId =
    campaignIds.length === 1
      ? campaignIds[0]
      : null

  const shopifyOrderId =
    stripShopifyGid(payload.id) ||
    String(payload.id)

  const orderNumber =
    payload.name ||
    payload.order_number ||
    payload.orderNumber ||
    shopifyOrderId

  const { data: existingOrder } =
    await supabase
      .from('orders')
      .select('id')
      .eq(
        'shopify_order_id',
        shopifyOrderId
      )
      .maybeSingle()

  const orderRecord = {
    organization_id:
      store.organization_id,
    campaign_id: campaignId,
    shopify_order_id:
      shopifyOrderId,
    shopify_order_number:
      String(orderNumber),
    customer_email:
      payload.email ||
      payload.customer?.email ||
      null,
    currency:
      payload.currency ||
      payload.currencyCode ||
      'USD',
    subtotal: money(
      payload.subtotal_price ??
        payload.current_subtotal_price ??
        payload.subtotalPriceSet
          ?.shopMoney?.amount
    ),
    total: money(
      payload.total_price ??
        payload.current_total_price ??
        payload.totalPriceSet
          ?.shopMoney?.amount
    ),
    status: mapOrderStatus(payload),
    placed_at:
      payload.created_at ||
      payload.createdAt ||
      new Date().toISOString(),
    updated_at:
      new Date().toISOString(),
  }

  let orderId = existingOrder?.id

  if (orderId) {
    const { error } = await supabase
      .from('orders')
      .update(orderRecord)
      .eq('id', orderId)

    if (error) throw error
  } else {
    const { data, error } = await supabase
      .from('orders')
      .insert(orderRecord)
      .select('id')
      .single()

    if (error) throw error

    orderId = data.id
  }

  const existingLineIds =
    mappedLines
      .map(({ line }) =>
        stripShopifyGid(
          line.id ||
            line.line_item_id ||
            line.lineItemId
        )
      )
      .filter(Boolean)

  let existingItems: any[] = []

  if (existingLineIds.length) {
    const { data } = await supabase
      .from('order_items')
      .select(`
        id,
        shopify_line_item_id,
        contribution_amount,
        refunded_contribution_amount
      `)
      .eq('order_id', orderId)
      .in(
        'shopify_line_item_id',
        existingLineIds
      )

    existingItems = data || []
  }

  const existingMap = new Map(
    existingItems.map((item) => [
      item.shopify_line_item_id,
      item,
    ])
  )

  for (const item of mappedLines) {
    const lineId =
      stripShopifyGid(
        item.line.id ||
          item.line.line_item_id ||
          item.line.lineItemId
      ) || crypto.randomUUID()

    const existing =
      existingMap.get(lineId)

    const contribution =
      existing
        ? money(
            existing.contribution_amount
          )
        : calculateContribution(
            item.campaignProduct,
            item.quantity,
            item.unitPrice
          )

    const record = {
      order_id: orderId,
      campaign_product_id:
        item.campaignProduct?.id || null,
      shopify_line_item_id:
        lineId,
      shopify_product_id:
        stripShopifyGid(
          item.productId
        ),
      shopify_variant_id:
        stripShopifyGid(
          item.variantId
        ),
      title:
        item.line.title ||
        item.line.name ||
        'Shopify item',
      variant_title:
        item.line.variant_title ||
        item.line.variantTitle ||
        null,
      sku:
        item.line.sku || null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      contribution_amount:
        contribution,
      refunded_contribution_amount:
        existing
          ? money(
              existing.refunded_contribution_amount
            )
          : 0,
    }

    if (existing) {
      const { error } = await supabase
        .from('order_items')
        .update(record)
        .eq('id', existing.id)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('order_items')
        .insert(record)

      if (error) throw error
    }
  }

  return {
    orderId,
    shopifyOrderId,
    campaignId,
    lineItemCount: mappedLines.length,
  }
}

export async function applyShopifyRefund(
  payload: any
) {
  const supabase = createAdminClient()

  const shopifyOrderId =
    stripShopifyGid(
      payload.order_id ||
      payload.orderId
    )

  if (!shopifyOrderId) {
    throw new Error(
      'Refund webhook missing order_id'
    )
  }

  const { data: order } =
    await supabase
      .from('orders')
      .select('id')
      .eq(
        'shopify_order_id',
        shopifyOrderId
      )
      .maybeSingle()

  if (!order) {
    return {
      skipped: true,
      reason: 'Order not imported yet',
    }
  }

  const refundItems =
    payload.refund_line_items || []

  for (const refundItem of refundItems) {
    const lineId =
      stripShopifyGid(
        refundItem.line_item_id ||
        refundItem.line_item?.id
      )

    if (!lineId) continue

    const { data: item } =
      await supabase
        .from('order_items')
        .select(`
          id,
          quantity,
          contribution_amount,
          refunded_contribution_amount
        `)
        .eq('order_id', order.id)
        .eq(
          'shopify_line_item_id',
          lineId
        )
        .maybeSingle()

    if (!item) continue

    const originalQuantity =
      Number(item.quantity || 0)

    if (originalQuantity <= 0) {
      continue
    }

    const refundQuantity =
      Number(
        refundItem.quantity || 0
      )

    const contributionPerUnit =
      money(
        item.contribution_amount
      ) / originalQuantity

    const additionalRefund =
      contributionPerUnit *
      refundQuantity

    const newRefundTotal =
      Math.min(
        money(
          item.contribution_amount
        ),
        money(
          item.refunded_contribution_amount
        ) + additionalRefund
      )

    const { error } =
      await supabase
        .from('order_items')
        .update({
          refunded_contribution_amount:
            Number(
              newRefundTotal.toFixed(2)
            ),
        })
        .eq('id', item.id)

    if (error) throw error
  }

  return {
    orderId: order.id,
    refundedItems:
      refundItems.length,
  }
}