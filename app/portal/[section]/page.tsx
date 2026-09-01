import Link from "next/link"
import PortalShell from "@/components/portal/PortalShell"
import SalesExplorer from "@/components/portal/SalesExplorer"
import OrdersExplorer from "@/components/portal/OrdersExplorer"
import ReportsTool from "@/components/portal/ReportsTool"
import MarketingTools from "@/components/portal/MarketingTools"
import PayoutRequestPanel from "@/components/portal/PayoutRequestPanel"
import { getPortalData, money, portalStats } from "@/lib/portal/data"

export const dynamic="force-dynamic"

export default async function PortalSection({params,searchParams}:{params:Promise<{section:string}>;searchParams:Promise<{org?:string;campaign?:string}>}){
  const {section}=await params
  const {org,campaign}=await searchParams
  const d=await getPortalData(org,campaign)
  const s=portalStats(d)
  const goal=Number(d.campaign?.goal_amount||0)
  const salesGoal=10000
  const pct=goal?Math.min(100,(s.raised/goal)*100):0
  const salesPct=salesGoal?Math.min(100,(s.gross/salesGoal)*100):0
  const start=d.campaign?.starts_at?new Date(d.campaign.starts_at):null
  const end=d.campaign?.ends_at?new Date(d.campaign.ends_at):null
  const daysRemaining=end?Math.max(0,Math.ceil((end.getTime()-Date.now())/86400000)):0

  const orderRows=d.orders.map((o:any)=>{
    const oi=d.items.filter((i:any)=>i.order_id===o.id)
    const items=oi.reduce((a:number,i:any)=>a+Number(i.quantity||0),0)
    const gross=oi.reduce((a:number,i:any)=>a+Number(i.unit_price||0)*Number(i.quantity||0),0)
    const refund=oi.reduce((a:number,i:any)=>a+Number(i.refunded_merchandise_amount||0),0)
    const eligible=Math.max(0,gross-refund)
    const raised=oi.reduce((a:number,i:any)=>a+Number(i.contribution_amount||0)-Number(i.refunded_contribution_amount||0),0)
    return {id:o.id,order:"#"+(o.shopify_order_number||"—"),date:o.placed_at?new Date(o.placed_at).toLocaleDateString():"—",customer:[o.customer_first_name,o.customer_last_initial].filter(Boolean).join(" ")||o.customer_email||"Customer",email:o.customer_email||"",items,gross,eligible,refund,raised,payment:o.status||"pending",fulfillment:o.fulfillment_status||"unfulfilled"}
  })

  const productMap=new Map<string,any>()
  for(const p of d.products){
    const key=String(p.shopify_product_id||p.id)
    if(!productMap.has(key)) productMap.set(key,{id:key,title:p.title,image:p.image_url,price:Number(p.retail_price||0),qty:0,gross:0,raised:0,refund:0})
  }
  for(const i of d.items){
    const key=String(i.shopify_product_id||i.campaign_product_id||i.title)
    const cur=productMap.get(key)||{id:key,title:i.title,image:null,price:Number(i.unit_price||0),qty:0,gross:0,raised:0,refund:0}
    cur.qty+=Number(i.quantity||0);cur.gross+=Number(i.unit_price||0)*Number(i.quantity||0);cur.raised+=Number(i.contribution_amount||0)-Number(i.refunded_contribution_amount||0);cur.refund+=Number(i.refunded_merchandise_amount||0)
    productMap.set(key,cur)
  }
  const products=[...productMap.values()].sort((a,b)=>b.gross-a.gross)

  const payoutRows=d.payouts.map((p:any)=>({date:new Date(p.created_at).toLocaleDateString(),status:p.status,gross:Number(p.gross_sales||0),contribution:Number(p.contribution_amount||0),payout:Number(p.payout_amount||0)}))
  const lastSynced=d.lastWebhook?.created_at||null
  const nowMs=Date.now()
  function grossInWindow(fromDays:number,toDays:number){
    const from=nowMs-fromDays*86400000
    const to=nowMs-toDays*86400000
    const ids=new Set(d.orders.filter((o:any)=>{const t=o.placed_at?new Date(o.placed_at).getTime():0;return t>=from&&t<to}).map((o:any)=>o.id))
    return d.items.filter((i:any)=>ids.has(i.order_id)).reduce((a:number,i:any)=>a+Number(i.unit_price||0)*Number(i.quantity||0),0)
  }
  const last3Sales=grossInWindow(3,0)
  const previous3Sales=grossInWindow(6,3)

  let content:React.ReactNode

  if(section==="sales") content=<SalesExplorer orders={d.orders} items={d.items} products={d.products}/>
  else if(section==="orders") content=<OrdersExplorer rows={orderRows}/>
  else if(section==="reports") content=<ReportsTool org={d.org.name} campaign={d.campaign?.name||"Campaign"} orders={orderRows} products={products} payouts={payoutRows} totals={s}/>
  else if(section==="marketing") content=<MarketingTools campaignId={d.campaign?.id||""} organizationId={d.organizationId} url={d.campaign?.public_store_url||""} orgName={d.org.name} orgLogo={d.org.logo_url||null} campaignName={d.campaign?.name||"Campaign"} daysRemaining={daysRemaining} pct={pct} raised={money(s.raised)} goal={money(goal)} startsAt={d.campaign?.starts_at||null} endsAt={d.campaign?.ends_at||null} products={products.slice(0,8)} last3Sales={last3Sales} previous3Sales={previous3Sales}/>
  else if(section==="products") content=<>
    <div className="agency-page-head"><div><h1>Products</h1><p>Campaign product performance and rankings from Shopify orders</p></div></div>
    <section className="agency-product-grid">{products.map((p:any,i:number)=><article className="agency-product-card" key={p.id}>
      <div className="agency-product-image">{p.image?<img src={p.image} alt=""/>:<span>PRODUCT</span>}{i===0&&p.gross>0&&<em>★ Top Earner</em>}</div>
      <div className="agency-product-body"><div className="agency-product-title"><strong>{p.title}</strong><span className="agency-pill active">Active</span></div><small>{p.price?money(p.price):"Campaign item"}</small>
      <div className="agency-product-stats"><div><span>Units</span><b>{p.qty}</b></div><div><span>Gross</span><b>{money(p.gross)}</b></div><div><span>Refunds</span><b className="red">{money(p.refund)}</b></div><div><span>Raised</span><b className="green">{money(p.raised)}</b></div></div>
      <div className="agency-payout-rule"><span>Contribution rule</span><b>{d.products.find((x:any)=>String(x.shopify_product_id||x.id)===p.id)?.contribution_type==="fixed"?"Fixed contribution":"Percentage contribution"}</b></div></div>
    </article>)}</section>
  </>
  else if(section==="progress") content=<>
    <div className="agency-page-head"><div><h1>Campaign Progress</h1><p>Visual performance tracker using current campaign data</p></div></div>
    <section className="agency-grid-2">
      <article className="agency-card agency-goal-card"><header><div><h2>Fundraising Goal</h2><p>Progress toward fundraising target</p></div></header><div><strong>{money(s.raised)}</strong><span>of {money(goal)}</span><b>{pct.toFixed(1)}%</b></div><div className="agency-progress"><i style={{width:pct+"%"}}/></div></article>
      <article className="agency-card agency-goal-card"><header><div><h2>Sales Goal</h2><p>Progress toward total sales target</p></div></header><div><strong>{money(s.gross)}</strong><span>of {money(salesGoal)}</span><b>{salesPct.toFixed(1)}%</b></div><div className="agency-progress greenbar"><i style={{width:salesPct+"%"}}/></div></article>
    </section>
    <section className="agency-kpis four"><div><span>DAYS ELAPSED</span><strong>{start?Math.max(0,Math.ceil((Date.now()-start.getTime())/86400000)):0}</strong></div><div><span>DAYS REMAINING</span><strong className="orange">{daysRemaining}</strong></div><div><span>REQUIRED DAILY SALES</span><strong>{money(daysRemaining?Math.max(0,salesGoal-s.gross)/daysRemaining:0)}</strong></div><div><span>AVG. DAILY SALES</span><strong className="green">{money(start?s.gross/Math.max(1,Math.ceil((Date.now()-start.getTime())/86400000)):0)}</strong></div></section>
  </>
  else if(section==="payouts") content=<>
    <div className="agency-page-head"><div><h1>{section==="payouts"?"Payouts":"Payout Assistant"}</h1><p>Transparent campaign payout information</p></div></div>
    <div className="agency-notice">⚠ <b>Estimate notice:</b> Fundraising proceeds before approval are estimates. Approved payout records below are the source of truth.</div>
    <section className="agency-kpis four"><div><span>TOTAL EARNED</span><strong>{money(d.payouts.reduce((a:number,p:any)=>a+Number(p.payout_amount||0),0))}</strong></div><div><span>TOTAL PAID</span><strong className="green">{money(d.payouts.filter((p:any)=>p.status==="paid").reduce((a:number,p:any)=>a+Number(p.payout_amount||0),0))}</strong></div><div><span>PENDING</span><strong>{money(d.payouts.filter((p:any)=>["pending","processing"].includes(p.status)).reduce((a:number,p:any)=>a+Number(p.payout_amount||0),0))}</strong></div><div><span>AVAILABLE FOR PAYOUT</span><strong>{money(d.payouts.filter((p:any)=>p.status==="approved").reduce((a:number,p:any)=>a+Number(p.payout_amount||0),0))}</strong></div></section>
    <PayoutRequestPanel organizationId={d.organizationId} campaignId={d.campaign?.id||""} available={Math.max(0,s.raised-d.payouts.filter((p:any)=>p.status!=="cancelled").reduce((a:number,p:any)=>a+Number(p.payout_amount||0),0))} threshold={Number(d.campaign?.min_payout_threshold||0)} canRequest={d.canManage} openRequest={d.payoutRequests.find((r:any)=>["requested","approved","processing"].includes(r.status))||null}/>
    <section className="agency-card"><header><div><h2>Payout Request History</h2><p>Every request and its status</p></div></header>{d.payoutRequests.length?<div className="agency-table-wrap"><table className="agency-table"><thead><tr><th>REQUESTED</th><th>AMOUNT</th><th>STATUS</th><th>REVIEWED</th><th>NOTE</th></tr></thead><tbody>{d.payoutRequests.map((r:any)=><tr key={r.id}><td>{new Date(r.requested_at).toLocaleDateString()}</td><td><b>{money(Number(r.requested_amount||0))}</b></td><td><span className={"agency-pill "+r.status}>{r.status}</span></td><td>{r.reviewed_at?new Date(r.reviewed_at).toLocaleDateString():"—"}</td><td>{r.admin_note||r.note||"—"}</td></tr>)}</tbody></table></div>:<div className="agency-empty">No payout requests yet.</div>}</section>
    <section className="agency-card"><header><div><h2>Payout Ledger</h2><p>Complete history of campaign disbursements</p></div></header>{d.payouts.length?<div className="agency-table-wrap"><table className="agency-table"><thead><tr><th>DATE</th><th>STATUS</th><th>GROSS</th><th>CONTRIBUTION</th><th>PAYOUT</th></tr></thead><tbody>{d.payouts.map((p:any)=><tr key={p.id}><td>{new Date(p.created_at).toLocaleDateString()}</td><td><span className="agency-pill">{p.status}</span></td><td>{money(Number(p.gross_sales||0))}</td><td>{money(Number(p.contribution_amount||0))}</td><td><b>{money(Number(p.payout_amount||0))}</b></td></tr>)}</tbody></table></div>:<div className="agency-empty big">No approved payouts yet.</div>}</section>
  </>
  else if(section==="settings") content=<>
    <div className="agency-page-head"><div><h1>Account Settings</h1><p>Department portal access and profile information</p></div></div>
    <section className="agency-grid-2"><article className="agency-card"><header><div><h2>Department Profile</h2></div></header><div className="agency-detail-list"><div><span>Organization</span><b>{d.org.name}</b></div><div><span>Contact</span><b>{d.org.contact_name||"—"}</b></div><div><span>Email</span><b>{d.org.contact_email||"—"}</b></div><div><span>Your role</span><b>{d.memberRole||"Platform preview"}</b></div></div></article>{d.canManage&&<article className="agency-card"><header><div><h2>Access Management</h2><p>Add users and change department roles</p></div></header><Link className="agency-primary-link" href={"/portal/members?org="+d.organizationId}>Manage Members →</Link></article>}</section>
  </>
  else content=<><div className="agency-page-head"><div><h1>Help Center</h1><p>Support for your fundraiser</p></div></div><section className="agency-card"><header><div><h2>Campaign Support</h2></div></header><div className="agency-detail-list"><div><span>Fundraising calculation</span><b>Based on contribution rules stored with each campaign product</b></div><div><span>Customer checkout</span><b>Shopify</b></div><div><span>Order synchronization</span><b>Shopify webhooks</b></div></div></section></>

  return <PortalShell org={d.org} campaign={d.campaign} campaigns={d.campaigns} userEmail={d.user.email||""} organizationId={d.organizationId} platform={d.platform} lastSynced={lastSynced}>{content}</PortalShell>
}
