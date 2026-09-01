import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic="force-dynamic"
function money(v:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(v||0)}

export default async function DepartmentPortal({searchParams}:{searchParams:Promise<{org?:string}>}){
  const {org:requestedOrg}=await searchParams
  const auth=await createClient()
  const {data:{user}}=await auth.auth.getUser()
  if(!user) redirect("/login")
  const db=createAdminClient()

  const [{data:platform},{data:memberships}]=await Promise.all([
    db.from("platform_admins").select("role").eq("user_id",user.id).eq("is_active",true).maybeSingle(),
    db.from("organization_members").select("organization_id,role").eq("user_id",user.id)
  ])

  let organizationId=requestedOrg||memberships?.[0]?.organization_id||null
  if(organizationId&&!platform&&!memberships?.some((m:any)=>m.organization_id===organizationId)) organizationId=null
  if(!organizationId){
    if(platform){
      const {data:first}=await db.from("organizations").select("id").eq("is_active",true).order("name").limit(1).maybeSingle()
      organizationId=first?.id||null
    }
  }
  if(!organizationId) redirect("/apply")

  const memberRole=memberships?.find((m:any)=>m.organization_id===organizationId)?.role||null
  const preview=!!platform&&!memberRole

  const [{data:org},{data:campaigns},{data:orders},{data:items},{data:payouts},{data:allOrgs}]=await Promise.all([
    db.from("organizations").select("id,name,organization_type,logo_url,contact_name").eq("id",organizationId).single(),
    db.from("campaigns").select("id,name,status,goal_amount,starts_at,ends_at").eq("organization_id",organizationId).order("created_at",{ascending:false}),
    db.from("orders").select("id,total,status,placed_at,shopify_order_number,campaign_id").eq("organization_id",organizationId).order("placed_at",{ascending:false}),
    db.from("order_items").select("order_id,quantity,unit_price,contribution_amount,refunded_contribution_amount"),
    db.from("payouts").select("id,payout_amount,status,created_at").eq("organization_id",organizationId).order("created_at",{ascending:false}),
    platform?db.from("organizations").select("id,name").eq("is_active",true).order("name"):Promise.resolve({data:[] as any[]})
  ])

  const orderIds=new Set((orders||[]).map((o:any)=>o.id))
  const eligible=(items||[]).filter((i:any)=>orderIds.has(i.order_id))
  const sales=eligible.reduce((s:number,i:any)=>s+Number(i.unit_price||0)*Number(i.quantity||0),0)
  const raised=eligible.reduce((s:number,i:any)=>s+Number(i.contribution_amount||0)-Number(i.refunded_contribution_amount||0),0)
  const pending=(payouts||[]).filter((p:any)=>["pending","approved","processing"].includes(p.status)).reduce((s:number,p:any)=>s+Number(p.payout_amount||0),0)
  const canManage=!!platform||memberRole==="owner"||memberRole==="admin"

  return <div className="portal-shell">
    <aside className="portal-sidebar">
      <Link href="/portal" className="portal-brand"><span className="portal-mark">FC</span><span><strong>{org.name}</strong><small>Department Portal</small></span></Link>
      {platform&&<div className="portal-preview">Platform preview</div>}
      {platform&&<form><label>Preview department<select name="org" defaultValue={organizationId}>{(allOrgs||[]).map((o:any)=><option value={o.id} key={o.id}>{o.name}</option>)}</select></label><button className="portal-mini">Open</button></form>}
      <nav>
        <Link href={"/portal?org="+organizationId} className="active">Overview</Link>
        <a href="#campaigns">Campaigns</a>
        <a href="#orders">Orders</a>
        <a href="#payouts">Payouts</a>
        {canManage&&<Link href={"/portal/members?org="+organizationId}>Members</Link>}
      </nav>
      <div className="portal-sidebar-foot">
        <span>{user.email}</span>
        <span>{preview?"Preview":memberRole||"Member"}</span>
        {platform&&<Link href="/dashboard">Platform Admin ↗</Link>}
      </div>
    </aside>

    <main className="portal-main">
      <header className="portal-head">
        <div><div className="portal-kicker">DEPARTMENT OVERVIEW</div><h1>{org.name}</h1><p>See fundraiser performance, orders, payouts and member access in one place.</p></div>
        {canManage&&<Link href={"/portal/members?org="+organizationId} className="portal-button">Manage Members</Link>}
      </header>

      <section className="portal-stats">
        <div><span>Active Campaigns</span><strong>{(campaigns||[]).filter((c:any)=>c.status==="active").length}</strong></div>
        <div><span>Fundraiser Sales</span><strong>{money(sales)}</strong></div>
        <div><span>Net Raised</span><strong>{money(raised)}</strong></div>
        <div><span>Pending Payout</span><strong>{money(pending)}</strong></div>
      </section>

      <section className="portal-grid" id="campaigns">
        <article className="portal-card">
          <div className="portal-card-head"><div><span>CAMPAIGNS</span><h2>Fundraisers</h2></div></div>
          {(campaigns||[]).map((c:any)=><div className="portal-row" key={c.id}><div><strong>{c.name}</strong><small>{c.status}</small></div><span>{money(Number(c.goal_amount||0))} goal</span></div>)}
          {!campaigns?.length&&<div className="portal-empty">No campaigns yet.</div>}
        </article>

        <article className="portal-card" id="payouts">
          <div className="portal-card-head"><div><span>PAYOUTS</span><h2>Recent Payouts</h2></div></div>
          {(payouts||[]).slice(0,5).map((p:any)=><div className="portal-row" key={p.id}><div><strong>{money(Number(p.payout_amount||0))}</strong><small>{new Date(p.created_at).toLocaleDateString()}</small></div><span className={"portal-pill "+p.status}>{p.status}</span></div>)}
          {!payouts?.length&&<div className="portal-empty">No payouts yet.</div>}
        </article>
      </section>

      <section className="portal-card" id="orders">
        <div className="portal-card-head"><div><span>ORDERS</span><h2>Recent Orders</h2></div><strong>{orders?.length||0}</strong></div>
        <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Order</th><th>Status</th><th>Total</th><th>Date</th></tr></thead><tbody>{(orders||[]).slice(0,12).map((o:any)=><tr key={o.id}><td>#{o.shopify_order_number||"—"}</td><td><span className={"portal-pill "+o.status}>{o.status}</span></td><td>{money(Number(o.total||0))}</td><td>{o.placed_at?new Date(o.placed_at).toLocaleDateString():"—"}</td></tr>)}</tbody></table></div>
      </section>
    </main>
  </div>
}