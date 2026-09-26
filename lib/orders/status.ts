// Shopify fulfillment completion is not proof of carrier delivery.
const normalize = (value: unknown) => typeof value === 'string' ? value.toLowerCase() : ''
export function paymentStatus(order: any): string | undefined {
  if (order.cancelled_at || order.cancelledAt) return 'cancelled'
  const value = normalize(order.financial_status ?? order.displayFinancialStatus)
  if (!value) return undefined
  // Preserve the existing accounting enum; payment and shipment stay independent.
  return ['paid', 'refunded', 'partially_refunded'].includes(value) ? value : 'pending'
}
export function fulfillmentStatus(order: any): string | undefined {
  if (order.cancelled_at || order.cancelledAt) return 'cancelled'
  const hasStatus = 'fulfillment_status' in order || 'displayFulfillmentStatus' in order
  if (!hasStatus) return undefined
  const raw = normalize(order.fulfillment_status ?? order.displayFulfillmentStatus) || 'unfulfilled'
  const status = raw === 'partially_fulfilled' ? 'partial' : raw
  if (status !== 'fulfilled') return status
  const list = Array.isArray(order.fulfillments) ? order.fulfillments : order.fulfillments?.nodes || []
  const active = list.filter((f: any) => !['cancelled', 'canceled', 'failure', 'error'].includes(normalize(f.status)))
  const delivered = (f: any) => Boolean(f.deliveredAt) || normalize(f.shipment_status ?? f.displayStatus) === 'delivered'
  if (active.length && active.every(delivered)) return 'delivered'
  if (active.some(delivered)) return 'partially_delivered'
  const states = active.map((f: any) => normalize(f.shipment_status ?? f.displayStatus))
  for (const state of ['failure','not_delivered','attempted_delivery','delayed','out_for_delivery','in_transit','carrier_picked_up','ready_for_pickup','picked_up','label_printed','label_purchased']) {
    if (states.includes(state)) return state
  }
  return 'fulfilled'
}
export function statusLabel(value?: string | null) {
  return (value || 'unknown').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
}
export function orderFulfillment(order: any) {
  if (order.status === 'cancelled') return 'cancelled'
  const value = normalize(order.fulfillment_status) || 'unknown'
  return value === 'partially_fulfilled' ? 'partial' : value
}
export function awaitingFulfillment(order: any) {
  return ['unfulfilled','partial','scheduled','on_hold','in_progress','open','pending_fulfillment'].includes(orderFulfillment(order))
}
