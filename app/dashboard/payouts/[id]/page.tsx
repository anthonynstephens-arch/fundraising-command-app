import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

function money(v: unknown) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v || 0))
}

export default async function PayoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userDb = await createClient()
  const { data: { user } } = await userDb.auth.getUser()
  if (!user) redirect("/login")

  const db = createAdminClient()
  const { data: payout } = await db.from("payouts").select(`
    *,
    organization:organizations(name),
    campaign:campaigns(name,id)
  `).eq("id", id).maybeSingle()

  if (!payout) notFound()

  const { data: payoutItems } = await db.from("payout_items").select(`
    id,contribution_amount,adjustment_amount,payout_amount,
    order:orders(shopify_order_number,placed_at),
    item:order_items(title,variant_title,quantity,unit_price)
  `).eq("payout_id", id).order("created_at", { ascending: true })

  const org = Array.isArray(payout.organization) ? payout.organization[0] : payout.organization
  const campaign = Array.isArray(payout.campaign) ? payout.campaign[0] : payout.campaign

  return (
    <>
      <section className="fc-page-header">
        <div>
          <div className="fc-kicker">PAYOUT DETAIL</div>
          <h1>{money(payout.payout_amount)}</h1>
          <p>{org?.name || "Organization"} · {campaign?.name || "Campaign"}</p>
        </div>
        <div className="fc-head-actions">
          <Link href="/dashboard/payouts" className="fc-btn">← Payouts</Link>
          {campaign?.id && <Link href={`/dashboard/campaigns/${campaign.id}`} className="fc-btn">Campaign</Link>}
        </div>
      </section>

      <section className="fc-metrics">
        <div className="fc-metric"><span>Status</span><strong>{payout.status}</strong></div>
        <div className="fc-metric"><span>Eligible Sales</span><strong>{money(payout.gross_sales)}</strong></div>
        <div className="fc-metric"><span>Contribution</span><strong>{money(payout.contribution_amount)}</strong></div>
        <div className="fc-metric"><span>Adjustment</span><strong>{money(payout.adjustment_amount)}</strong></div>
      </section>

      <section className="fc-card">
        <div className="fc-card-head">
          <div><div className="fc-kicker">RECONCILIATION</div><h2>Included Order Items</h2></div>
          <span className="fc-count">{payoutItems?.length || 0}</span>
        </div>

        <div className="fc-table-scroll">
          <table className="fc-table">
            <thead>
              <tr><th>Order</th><th>Item</th><th>Variant</th><th>Qty</th><th>Unit Price</th><th>Contribution</th><th>Adjustment</th><th>Payout</th></tr>
            </thead>
            <tbody>
              {(payoutItems || []).map((row: any) => {
                const order = Array.isArray(row.order) ? row.order[0] : row.order
                const item = Array.isArray(row.item) ? row.item[0] : row.item
                return (
                  <tr key={row.id}>
                    <td><strong>#{order?.shopify_order_number || "—"}</strong></td>
                    <td>{item?.title || "—"}</td>
                    <td>{item?.variant_title || "—"}</td>
                    <td>{item?.quantity || 0}</td>
                    <td>{money(item?.unit_price)}</td>
                    <td>{money(row.contribution_amount)}</td>
                    <td>{money(row.adjustment_amount)}</td>
                    <td><strong>{money(row.payout_amount)}</strong></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}