import { redirect, notFound } from "next/navigation"
import AdminShell from "@/components/admin/AdminShell"
import CampaignBrandingForm from "@/components/admin/CampaignBrandingForm"
import PayoutGenerator from "@/components/admin/PayoutGenerator"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

function money(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v || 0)
}

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userDb = await createClient()
  const { data: { user } } = await userDb.auth.getUser()
  if (!user) redirect("/login")

  const { data: admin } = await userDb.from("platform_admins").select("role").eq("user_id", user.id).eq("is_active", true).maybeSingle()
  if (!admin) redirect("/dashboard")

  const db = createAdminClient()
  const { data: campaign } = await db.from("campaigns").select(`
    *, organization:organizations(name,slug)
  `).eq("id", id).maybeSingle()
  if (!campaign) notFound()

  const { data: products } = await db.from("campaign_products").select("id,title,variant_title,retail_price").eq("campaign_id", id)
  const productIds = (products || []).map((p: any) => p.id)

  const { data: items } = productIds.length
    ? await db.from("order_items").select("order_id,quantity,unit_price,contribution_amount,refunded_contribution_amount").in("campaign_product_id", productIds)
    : { data: [] }

  const orderIds = [...new Set((items || []).map((i: any) => i.order_id))]
  const { data: orders } = orderIds.length
    ? await db.from("orders").select("id,status").in("id", orderIds).neq("status","cancelled")
    : { data: [] }

  const valid = new Set((orders || []).map((o: any) => o.id))
  const eligible = (items || []).filter((i: any) => valid.has(i.order_id))
  const sales = eligible.reduce((s: number, i: any) => s + Number(i.unit_price || 0) * Number(i.quantity || 0), 0)
  const raised = eligible.reduce((s: number, i: any) => s + Number(i.contribution_amount || 0), 0)
  const refunded = eligible.reduce((s: number, i: any) => s + Number(i.refunded_contribution_amount || 0), 0)
  const net = Math.max(0, raised - refunded)
  const goal = Number(campaign.goal_amount || 0)
  const progress = goal > 0 ? Math.min(100, net / goal * 100) : 0
  const org = Array.isArray(campaign.organization) ? campaign.organization[0] : campaign.organization

  return (
    <AdminShell active="Campaigns">
      <div className="fc-page-head">
        <div>
          <div className="fc-eyebrow">{org?.name || "Campaign"}</div>
          <h1>{campaign.name}</h1>
          <p>Live campaign operations, public presentation, contribution rules and payout readiness.</p>
        </div>
        <div className="fc-head-actions">
          <a className="fc-btn" href={`/fundraisers/${campaign.slug}`} target="_blank">Public Campaign ↗</a>
          <a className="fc-btn fc-btn-primary" href={`/dashboard/campaigns/${campaign.id}/products`}>Configure Contributions</a>
        </div>
      </div>

      <div className="fc-stat-grid">
        <div className="fc-stat-card"><span>Fundraiser Sales</span><strong>{money(sales)}</strong></div>
        <div className="fc-stat-card"><span>Net Raised</span><strong>{money(net)}</strong></div>
        <div className="fc-stat-card"><span>Orders</span><strong>{valid.size}</strong></div>
        <div className="fc-stat-card"><span>Goal Progress</span><strong>{progress.toFixed(1)}%</strong></div>
      </div>

      <div className="fc-panel">
        <div className="fc-panel-head"><div><span className="fc-eyebrow">PUBLIC EXPERIENCE</span><h2>Campaign Branding & Storefront</h2></div></div>
        <CampaignBrandingForm campaign={campaign} />
      </div>

      <div className="fc-panel">
        <div className="fc-panel-head">
          <div><span className="fc-eyebrow">PAYOUT ENGINE</span><h2>{money(net)} currently payable</h2></div>
          <PayoutGenerator campaignId={campaign.id} />
        </div>
        <p className="fc-muted">Refunded contribution is deducted from the payout amount. Historical contribution snapshots are not rewritten.</p>
      </div>

      <div className="fc-panel">
        <div className="fc-panel-head"><div><span className="fc-eyebrow">CAMPAIGN INVENTORY</span><h2>{products?.length || 0} linked variants</h2></div></div>
        <div className="fc-progress-track"><div style={{width:`${progress}%`}} /></div>
        <div className="fc-progress-label"><span>{money(net)} raised</span><span>{goal ? `${money(goal)} goal` : "No goal set"}</span></div>
      </div>
    </AdminShell>
  )
}