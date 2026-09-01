import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

function money(v: unknown) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v || 0))
}

function date(v: string | null) {
  if (!v) return "—"
  return new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric", year: "numeric" }).format(new Date(v))
}

export default async function OrdersPage() {
  const userDb = await createClient()
  const { data: { user } } = await userDb.auth.getUser()
  if (!user) redirect("/login")

  const db = createAdminClient()
  const { data: orders } = await db
    .from("orders")
    .select(`
      id,shopify_order_number,total,subtotal,status,placed_at,customer_email,campaign_id,
      organization:organizations(name),
      campaign:campaigns(name)
    `)
    .order("placed_at", { ascending: false })

  const orderIds = (orders || []).map((o: any) => o.id)
  const { data: items } = orderIds.length
    ? await db.from("order_items").select("order_id,contribution_amount,refunded_contribution_amount").in("order_id", orderIds)
    : { data: [] as any[] }

  const contributionByOrder = new Map<string, number>()
  for (const item of items || []) {
    contributionByOrder.set(
      item.order_id,
      (contributionByOrder.get(item.order_id) || 0) +
      Number(item.contribution_amount || 0) -
      Number(item.refunded_contribution_amount || 0)
    )
  }

  const gross = (orders || []).reduce((s: number, o: any) => s + Number(o.total || 0), 0)
  const paid = (orders || []).filter((o: any) => o.status === "paid").length
  const refunded = (orders || []).filter((o: any) => o.status === "refunded").length
  const contribution = [...contributionByOrder.values()].reduce((a, b) => a + b, 0)

  return (
    <>
      <section className="fc-page-header">
        <div>
          <div className="fc-kicker">COMMERCE</div>
          <h1>Orders</h1>
          <p>Shopify orders attributed to Fundraising Command campaigns.</p>
        </div>
      </section>

      <section className="fc-metrics">
        <div className="fc-metric"><span>Orders</span><strong>{orders?.length || 0}</strong></div>
        <div className="fc-metric"><span>Gross Sales</span><strong>{money(gross)}</strong></div>
        <div className="fc-metric"><span>Net Contribution</span><strong>{money(contribution)}</strong></div>
        <div className="fc-metric"><span>Paid / Refunded</span><strong>{paid} / {refunded}</strong></div>
      </section>

      <section className="fc-card">
        <div className="fc-card-head">
          <div>
            <div className="fc-kicker">ORDER FEED</div>
            <h2>All Orders</h2>
          </div>
        </div>

        <div className="fc-table-scroll">
          <table className="fc-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Organization</th>
                <th>Campaign</th>
                <th>Status</th>
                <th>Contribution</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {(orders || []).map((order: any) => {
                const org = Array.isArray(order.organization) ? order.organization[0] : order.organization
                const campaign = Array.isArray(order.campaign) ? order.campaign[0] : order.campaign
                return (
                  <tr key={order.id}>
                    <td><strong>#{order.shopify_order_number || "—"}</strong></td>
                    <td>{org?.name || "—"}</td>
                    <td>{campaign?.name || "Unattributed"}</td>
                    <td><span className={`fc-pill ${order.status}`}>{order.status}</span></td>
                    <td>{money(contributionByOrder.get(order.id) || 0)}</td>
                    <td>{money(order.total)}</td>
                    <td>{date(order.placed_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!orders?.length && <div className="fc-empty">No orders have been imported yet.</div>}
      </section>
    </>
  )
}