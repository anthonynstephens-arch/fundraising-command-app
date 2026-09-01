import { redirect } from "next/navigation"
import AdminShell from "@/components/admin/AdminShell"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

function money(v: number) {
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(v || 0)
}

export default async function DashboardPage() {
  const userDb = await createClient()
  const { data: { user } } = await userDb.auth.getUser()
  if (!user) redirect("/login")
  const db = createAdminClient()

  const [{count: orgCount},{count: campaignCount},{data: orders},{data: items},{data: payouts},{data: applications}] = await Promise.all([
    db.from("organizations").select("*",{count:"exact",head:true}).eq("is_active",true),
    db.from("campaigns").select("*",{count:"exact",head:true}).eq("status","active"),
    db.from("orders").select("id,status,total").neq("status","cancelled"),
    db.from("order_items").select("order_id,quantity,unit_price,contribution_amount,refunded_contribution_amount"),
    db.from("payouts").select("payout_amount,status"),
    db.from("applications").select("id,status").eq("status","pending"),
  ])

  const validOrders = new Set((orders || []).map((o:any)=>o.id))
  const eligible = (items || []).filter((i:any)=>validOrders.has(i.order_id))
  const campaignSales = eligible.reduce((s:number,i:any)=>s+Number(i.unit_price||0)*Number(i.quantity||0),0)
  const raised = eligible.reduce((s:number,i:any)=>s+Number(i.contribution_amount||0)-Number(i.refunded_contribution_amount||0),0)
  const pendingPayouts = (payouts || []).filter((p:any)=>["pending","approved","processing"].includes(p.status)).reduce((s:number,p:any)=>s+Number(p.payout_amount||0),0)

  return <AdminShell active="Overview">
    <div className="fc-page-head">
      <div><div className="fc-eyebrow">COMMAND CENTER</div><h1>Overview</h1><p>Live commerce, fundraising, applications and payout readiness.</p></div>
      <div className="fc-head-actions"><a href="/fundraisers" target="_blank" className="fc-btn">Public Site ↗</a><a href="/dashboard/campaigns/new" className="fc-btn fc-btn-primary">New Campaign</a></div>
    </div>

    <div className="fc-stat-grid">
      <div className="fc-stat-card"><span>Active Campaigns</span><strong>{campaignCount || 0}</strong></div>
      <div className="fc-stat-card"><span>Fundraiser Sales</span><strong>{money(campaignSales)}</strong></div>
      <div className="fc-stat-card"><span>Net Raised</span><strong>{money(raised)}</strong></div>
      <div className="fc-stat-card"><span>Pending Payouts</span><strong>{money(pendingPayouts)}</strong></div>
    </div>

    <div className="fc-dashboard-grid">
      <div className="fc-panel">
        <div className="fc-panel-head"><div><span className="fc-eyebrow">OPERATIONS</span><h2>Platform Status</h2></div></div>
        <div className="fc-kpi-list">
          <div><span>Organizations</span><strong>{orgCount || 0}</strong></div>
          <div><span>Tracked orders</span><strong>{orders?.length || 0}</strong></div>
          <div><span>Pending applications</span><strong>{applications?.length || 0}</strong></div>
          <div><span>Net campaign contribution</span><strong>{money(raised)}</strong></div>
        </div>
      </div>

      <div className="fc-panel">
        <div className="fc-panel-head"><div><span className="fc-eyebrow">QUICK ACTIONS</span><h2>Keep Moving</h2></div></div>
        <div className="fc-quick-links">
          <a href="/dashboard/applications">Review Applications <span>→</span></a>
          <a href="/dashboard/campaigns">Manage Campaigns <span>→</span></a>
          <a href="/dashboard/shopify">Shopify Integration <span>→</span></a>
          <a href="/dashboard/payouts">Payout Center <span>→</span></a>
        </div>
      </div>
    </div>
  </AdminShell>
}