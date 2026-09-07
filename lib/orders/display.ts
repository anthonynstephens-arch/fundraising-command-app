export function orderLabel(value: unknown) {
  const normalized = String(value || "").trim().replace(/^#+/, "")
  return normalized ? `#${normalized}` : "—"
}

export function customerName(order: {
  customer_first_name?: string | null
  customer_last_name?: string | null
  customer_last_initial?: string | null
}) {
  const first = order.customer_first_name?.trim()
  const last = order.customer_last_name?.trim() || order.customer_last_initial?.trim()
  return [first, last].filter(Boolean).join(" ") || "Customer"
}
