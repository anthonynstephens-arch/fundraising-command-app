import Link from "next/link"
import PortalShell from "@/components/portal/PortalShell"
import { getPortalData, money, portalStats } from "@/lib/portal/data"

export const dynamic="force-dynamic"

export default async function PortalOverview({searchParams}:{searchParams:Promise<{org?:string}>}){
  const {org}=await searchParams
  const d=await getPortalData(org)
  const s=portalStats(d)
  const goal=Number(d.campaign?.goal_amount||0)
  const pct=goal?Math.min(100,(s.raised/goal)*100):0
  const start=d.campaign?.starts_at?new Date(d.campaign.starts_at):null
  const end=d.campaign?.ends_at?new Date(d.campaign.ends_at):null
  const today=new Date()
  const daysLeft=end?Math.max(0,Math.ceil((end.getTime()-today.getTime())/86400000)):0
  const firstName=(d.user.user_metadata?.full_name||d.user.email||"there").split(" ")[0]
  const productTotals=new Map<string,{title:string,gross:number,raised:number,qty:number}>()
  for(const i of d.items){
    const key=i.shopify_product_id||i.title
    const cur=productTotals.get(key)||{title:i.title,gross:0,raised:0,qty:0}
    cur.gross+=Number(i.unit_price||0)*Number(i.quantity||0)
    cur.raised+=Number(i.contribution_amount||0)-Number(i.refunded_contribution_amount||0)
    cur.qty+=Number(i.quantity||0)
    productTotals.set(key,cur)
  }
  const top=[...productTotals.values()].sort((a,b)=>b.gross-a.gross).slice(0,4)
  return <PortalShell org={d.org} campaign={d.campaign} userEmail={d.user.email||""} organizationId={d.organizationId} platform={d.platform}>
    <section className="agency-hero">
      <span>Welcome back,</span><h1>{firstName}</h1>
      <div className="agency-hero-tags">
        <b>◎ Viewing Campaign: {d.campaign?.name||"No active campaign"}</b>
        <b>▣ {start&&end?("Runs "+start.toLocaleDateString()+" — "+end.toLocaleDateString()):"Campaign schedule not set"}</b>
        <em>Active</em><em>◉ Live · Shopify connected</em>
      </div>
    </section>

    <section className="agency-kpis">
      <div><span>GROSS SALES</span><strong>{money(s.gross)}</strong><small>vs prior 30 days</small></div>
      <div><span>NET ELIGIBLE SALES</span><strong className="blue">{money(s.eligible)}</strong><small>vs prior 30 days</small></div>
      <div><span>EST. FUNDRAISING PROCEEDS</span><strong className="orange">{money(s.raised)}</strong><small>vs prior 30 days</small></div>
      <div><span>ORDERS</span><strong>{d.orders.length}</strong><small>vs prior 30 days</small></div>
      <div><span>ITEMS SOLD</span><strong>{s.units}</strong><small>vs prior 30 days</small></div>
      <div><span>AVG. ORDER VALUE</span><strong>{money(s.avg)}</strong><small>vs prior 30 days</small></div>
      <div><span>AVAILABLE FOR PAYOUT</span><strong className="green">{money(d.payouts.filter((p:any)=>p.status==="approved").reduce((a:number,p:any)=>a+Number(p.payout_amount||0),0))}</strong><small>next scheduled payout</small></div>
      <div><span>AWAITING FULFILLMENT</span><strong className="orange">{s.awaiting}</strong><small>orders pending shipment</small></div>
    </section>

    <section className="agency-grid-2">
      <article className="agency-card">
        <header><div><h2>Sales Over Time</h2><p>Track campaign performance across the selected period</p></div><div className="agency-tabs"><b>Sales</b><span>Orders</span><span>Items</span><span>Fundraising</span></div></header>
        <div className="agency-chart"><div className="agency-chart-line"><i style={{height:"38%"}}/><i style={{height:"46%"}}/><i style={{height:"58%"}}/><i style={{height:"66%"}}/></div></div>
      </article>
      <article className="agency-card">
        <header><div><h2>Fundraising Goal</h2><p>Progress toward your campaign target</p></div></header>
        <div className="agency-goal-ring" style={{"--pct":pct+"%"} as React.CSSProperties}><div><strong>{pct.toFixed(1)}%</strong><span>of goal</span></div></div>
        <div className="agency-goal-list"><div><span>Raised</span><b className="green">{money(s.raised)}</b></div><div><span>Goal</span><b>{money(goal)}</b></div><div><span>Remaining</span><b>{money(Math.max(0,goal-s.raised))}</b></div><div><span>Days left</span><b className="orange">{daysLeft}</b></div></div>
      </article>
    </section>

    <section className="agency-grid-2">
      <article className="agency-card">
        <header><div><h2>Campaign Snapshot</h2><p>Key campaign configuration</p></div></header>
        <div className="agency-detail-list">
          <div><span>Start date</span><b>{start?start.toLocaleDateString():"—"}</b></div>
          <div><span>End date</span><b>{end?end.toLocaleDateString():"—"}</b></div>
          <div><span>Store status</span><b className="agency-pill active">Active</b></div>
          <div><span>Calculation method</span><b>{d.campaign?.calculation_method||((d.campaign?.fundraising_percentage||20)+"% of net eligible sales")}</b></div>
        </div>
      </article>
      <article className="agency-card">
        <header><div><h2>Top Products</h2><p>Best-selling items this campaign</p></div><span>Based on gross sales</span></header>
        <div className="agency-product-ranks">{top.map((p,i)=><div key={p.title}><div className="agency-prod-thumb">{i+1}</div><div><strong>{i+1}. {p.title}</strong><small>{p.qty} sold · <b className="green">{money(p.raised)} raised</b></small><div className="agency-bar"><i style={{width:(top[0]?Math.max(8,(p.gross/top[0].gross)*100):0)+"%"}}/></div></div><b>{money(p.gross)}</b></div>)}</div>
      </article>
    </section>

    <section className="agency-grid-2">
      <article className="agency-card">
        <header><div><h2>Recent Orders</h2><p>Latest orders from your campaign</p></div><Link href={"/portal/orders?org="+d.organizationId}>View all →</Link></header>
        <div className="agency-table-wrap"><table className="agency-table"><thead><tr><th>ORDER</th><th>DATE</th><th>CUSTOMER</th><th>TOTAL</th><th>FUNDRAISING</th><th>STATUS</th></tr></thead><tbody>{d.orders.slice(0,5).map((o:any)=>{
          const oi=d.items.filter((i:any)=>i.order_id===o.id)
          const raised=oi.reduce((a:number,i:any)=>a+Number(i.contribution_amount||0)-Number(i.refunded_contribution_amount||0),0)
          const customer=[o.customer_first_name,o.customer_last_initial].filter(Boolean).join(" ")||o.customer_email||"Customer"
          return <tr key={o.id}><td><b>#{o.shopify_order_number||"—"}</b></td><td>{o.placed_at?new Date(o.placed_at).toLocaleDateString():"—"}</td><td>{customer}</td><td>{money(Number(o.total||0))}</td><td className="green"><b>{money(raised)}</b></td><td><span className="agency-pill active">{o.status}</span></td></tr>
        })}</tbody></table></div>
      </article>
      <article className="agency-card">
        <header><div><h2>Recent Activity</h2><p>Latest events for your campaign</p></div></header>
        <div className="agency-empty">Campaign activity will appear here as new orders and payouts are processed.</div>
      </article>
    </section>

    {d.canManage&&<section className="agency-card">
      <header><div><h2>Dashboard Access</h2><p>Accounts with access to this department&apos;s portal</p></div><Link href={"/portal/members?org="+d.organizationId}>Manage access →</Link></header>
      <div className="agency-table-wrap"><table className="agency-table"><thead><tr><th>EMAIL</th><th>ROLE</th><th>ACCESS</th></tr></thead><tbody>{d.members.map((m:any)=><tr key={m.id}><td>{d.userMap.get(m.user_id)||m.user_id}</td><td><span className="agency-pill">{m.role}</span></td><td>Department portal</td></tr>)}</tbody></table></div>
    </section>}
  </PortalShell>
}