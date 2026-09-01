import { redirect } from "next/navigation"
import AdminShell from "@/components/admin/AdminShell"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export default async function LaunchCheckPage() {
  const userDb = await createClient()
  const { data: { user } } = await userDb.auth.getUser()
  if (!user) redirect("/login")
  const { data: admin } = await userDb.from("platform_admins").select("role").eq("user_id", user.id).eq("is_active", true).maybeSingle()
  if (!admin) redirect("/portal")

  const db = createAdminClient()
  const [{ count: activeCampaigns }, { count: pendingApps }, { data: latestSuccess }, { data: latestFailure }, { count: storeCount }, { count: memberCount }] = await Promise.all([
    db.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
    db.from("applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    db.from("webhook_events").select("id,event_type,processed_at,created_at,error_message").not("processed_at", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("webhook_events").select("id,event_type,processed_at,created_at,error_message").not("error_message", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("shopify_stores").select("*", { count: "exact", head: true }).eq("is_active", true),
    db.from("organization_members").select("*", { count: "exact", head: true }),
  ])

  const successAfterFailure = !!latestSuccess && (!latestFailure || new Date(latestSuccess.created_at).getTime() > new Date(latestFailure.created_at).getTime())

  const checks = [
    { name: "Platform authentication", ok: true, detail: `Signed in as ${user.email || "platform admin"}` },
    { name: "Shopify store connection", ok: (storeCount || 0) > 0, detail: `${storeCount || 0} active store connection${storeCount === 1 ? "" : "s"}` },
    { name: "Active campaigns", ok: (activeCampaigns || 0) > 0, detail: `${activeCampaigns || 0} active campaign${activeCampaigns === 1 ? "" : "s"}` },
    { name: "Fresh webhook processing", ok: successAfterFailure, detail: latestSuccess ? `Latest success: ${latestSuccess.event_type} · ${new Date(latestSuccess.created_at).toLocaleString()}` : "No successfully processed webhook found" },
    { name: "Department member access", ok: (memberCount || 0) > 0, detail: `${memberCount || 0} organization membership${memberCount === 1 ? "" : "s"}` },
    { name: "Application queue", ok: true, detail: `${pendingApps || 0} pending application${pendingApps === 1 ? "" : "s"}` },
  ]
  const passed = checks.filter(c => c.ok).length

  return <AdminShell active="Launch Check">
    <div className="fc-page-head">
      <div><div className="fc-eyebrow">READINESS</div><h1>Launch Check</h1><p>Live checks for commerce, campaign data, member access and post-fix webhook processing.</p></div>
      <div className="fc-head-actions"><a className="fc-btn" href="/" target="_blank">Public Site ↗</a><a className="fc-btn" href="/portal" target="_blank">Department Portal ↗</a></div>
    </div>

    <div className="fc-stat-grid">
      <div className="fc-stat-card"><span>Checks Passing</span><strong>{passed}/{checks.length}</strong></div>
      <div className="fc-stat-card"><span>Active Campaigns</span><strong>{activeCampaigns || 0}</strong></div>
      <div className="fc-stat-card"><span>Pending Applications</span><strong>{pendingApps || 0}</strong></div>
      <div className="fc-stat-card"><span>Department Members</span><strong>{memberCount || 0}</strong></div>
    </div>

    <div className="fc-panel">
      <div className="fc-panel-head"><div><span className="fc-eyebrow">SYSTEM CHECKS</span><h2>Launch Readiness</h2></div></div>
      <div className="fc-kpi-list">
        {checks.map(c => <div key={c.name}><span>{c.ok ? "✓" : "!"} {c.name}</span><strong>{c.detail}</strong></div>)}
      </div>
    </div>

    {latestFailure && <div className="fc-panel">
      <div className="fc-panel-head"><div><span className="fc-eyebrow">HISTORICAL WEBHOOK ERROR</span><h2>{latestFailure.event_type}</h2></div></div>
      <p className="fc-muted">{latestFailure.error_message || "Unknown webhook error"}</p>
      <p className="fc-muted">{successAfterFailure ? "A newer webhook has processed successfully after this failure." : "No newer successful event has been verified yet."}</p>
    </div>}
  </AdminShell>
}