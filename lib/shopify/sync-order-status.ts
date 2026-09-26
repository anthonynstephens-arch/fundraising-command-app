import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { shopifyGraphQL, stripShopifyGid } from './admin'
import { fulfillmentStatus, paymentStatus } from '@/lib/orders/status'

export const orderStatusQuery = `query OrderStatuses($ids: [ID!]!) {
  nodes(ids: $ids) { ... on Order {
    id cancelledAt displayFinancialStatus displayFulfillmentStatus
    fulfillments { status displayStatus deliveredAt }
  } }
}`

// Only update existing orders: status repair must not reattribute items or recalculate payouts.
export async function saveOrderStatus(payload: any) {
  const id = stripShopifyGid(payload.id)
  if (!id) return
  const status = paymentStatus(payload)
  const fulfillment = fulfillmentStatus(payload)
  const patch: Record<string, string> = {}
  if (status) patch.status = status
  if (fulfillment) patch.fulfillment_status = fulfillment
  if (!Object.keys(patch).length) return
  const { error } = await createAdminClient().from('orders').update(patch).eq('shopify_order_id', id)
  if (error) throw error
}

export async function syncOrderStatuses(campaignId?: string) {
  const db = createAdminClient()
  let synced = 0
  for (let from = 0;; from += 100) {
    let query = db.from('orders').select('id,shopify_order_id').order('id').range(from, from + 99)
    if (campaignId) query = query.eq('campaign_id', campaignId)
    const { data, error } = await query
    if (error) throw error
    for (let offset = 0; offset < (data || []).length; offset += 20) {
      const ids = data!.slice(offset, offset + 20).map(o => `gid://shopify/Order/${stripShopifyGid(o.shopify_order_id)}`)
      const result = await shopifyGraphQL(orderStatusQuery, { ids })
      for (const order of result.nodes || []) {
        if (!order) continue
        await saveOrderStatus(order)
        synced++
      }
    }
    if ((data || []).length < 100) break
  }
  return { synced }
}
