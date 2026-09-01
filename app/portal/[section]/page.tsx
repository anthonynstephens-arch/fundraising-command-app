import Link from "next/link"
import PortalShell from "@/components/portal/PortalShell"
import { getPortalData, money, portalStats } from "@/lib/portal/data"

export const dynamic="force-dynamic"

export default async function PortalSection({params,searchParams}:{params:Promise<{section:string}>;searchParams:Promise<{org?:string}>}){
  const {section}=await params
  const {org}=await searchParams
  const d=await getPortalData(org)
  const s=portalStats(d)
  const goal=Number(d.campaign?.goal_amount||0)
  const salesGoal=Number(d.campaign?.sales_goal||10000)
  const pct=goal?Math.min(100,(s.raised/goal)*100):0
  const salesPct=salesGoal?Math.min(100,(s.gross/salesGoal)*100):0
  const start=d.campaign?.starts_at?new Date(d.campaign.starts_at):null
  const end=d.campaign?.ends_at?new Date(d.campaign.ends_at):null
  const daysRemaining=end?Math.max(0,Math.ceil((end.getTime()-Date.now())/86400000)):0

  const titleMap:any={sales:"Sales Analytics",orders:"Orders",products:"Products",progress:"Campaign Progress",payouts:"Payouts",reports:"Reports",marketing:"Marketing Tools",help:"Help Center","payout-assistant":"Payout Assistant",settings:"Account Settings"}
  const descMap:any={sales:"Detailed breakdown of campaign sales performance",orders:"Searchable, filterable order ledger for your campaign",products:"Campaign product performance and rankings",progress:"Visual performance tracker for your campaign",payouts:"Transparent ledger of fundraising payouts to your department",reports:"Generate branded reports for your campaign",marketing:"Ready-to-use tools to share your campaign",help:"Answers and support for your fundraiser","payout-assistant":"Understand what is available, pending, and paid",settings:"Department portal and account preferences"}

  const productTotals=new Map<string,{id:string,title:string,image:string|null,gross:number,raised:number,qty:number,price:number}>()
  for(const p of d.products){
    const key=p.shopify_product_id||p.title
    if(!productTotals.has(key)) productTotals.set(key,{id:key,title:p.title,image:p.image_url,gross:0,raised:0,qty:0,price:Number(p.retail_price||0)})
  }
  for(const i of d.items){
    const key=i.shopify_product_id||i.title
    const cur=productTotals.get(key)||{id:key,title:i.title,image:null,gross:0,raised:0,qty:0,price:Number(i.unit_price||0)}
    cur.gross+=Number(i.unit_price||0)*Number(i.quantity||0)
    cur.raised+=Number(i.contribution_amount||0)-Number(i.refunded_contribution_amount||0)
    cur.qty+=Number(i.quantity||0)
    productTotals.set(key,cur)
  }
  const products=[...productTotals.values()].sort((a,b)=>b.gross-a.gross)

  const PageHeader=()=> <div className="agency-page-head"><div><h1>{titleMap[section]||"Department Portal"}</h1><p>{descMap[section]||"Department tools"}</p></div></div>

  let content:React.ReactNode=null

  if(section==="sales") content=<>
    <PageHeader/>
    <section className="agency-card agency-filter-card"><header><div><h2>Filters</h2><p>Refine the data shown below</p></div></header><div className="agency-filter-row"><div><label>Date range</label><div className="agency-tabs"><span>7 days</span><span>30 days</span><b>60 days</b><span>90 days</span></div></div><label>Product<select><option>All products</option></select></label><label>Payment status<select><option>All statuses</option></select></label><strong>{d.orders.length} orders · {money(s.gross)} gross</strong></div></section>
    <section className="agency-kpis four"><div><span>GROSS SALES</span><strong>{money(s.gross)}</strong></div><div><span>NET ELIGIBLE</span><strong>{money(s.eligible)}</strong></div><div><span>FUNDRAISING</span><strong className="orange">{money(s.raised)}</strong></div><div><span>AVG. ORDER VALUE</span><strong>{money(s.avg)}</strong></div></section>
    <section className="agency-card"><header><div><h2>Sales by Day</h2><p>Last 60 days</p></div></header><div className="agency-chart tall"><div className="agency-chart-line"><i style={{height:"33%"}}/><i style={{height:"49%"}}/><i style={{height:"63%"}}/><i style={{height:"76%"}}/></div></div></section>
    <section className="agency-grid-2"><article className="agency-card"><header><div><h2>Sales by Product</h2><p>Gross sales per product</p></div></header><div className="agency-bars">{products.slice(0,5).map((p:any)=><div key={p.id}><span>{p.title}</span><i style={{width:(products[0]?Math.max(8,p.gross/products[0].gross*100):0)+"%"}}/><b>{money(p.gross)}</b></div>)}</div></article><article className="agency-card"><header><div><h2>Fundraising Proceeds</h2><p>Current campaign contribution</p></div></header><div className="agency-big-number green">{money(s.raised)}</div></article></section>
  </>

  if(section==="orders") content=<>
    <PageHeader/>
    <section className="agency-card agency-filter-card"><header><div><h2>Filter Orders</h2></div></header><div className="agency-filter-row"><input placeholder="Search order # or customer..."/><select><option>All payment</option></select><select><option>All fulfillment</option></select><strong>{d.orders.length} orders</strong></div></section>
    <section className="agency-card"><header><div><h2>Pending Shipment</h2><p>Unfulfilled and partially fulfilled orders</p></div><b className="orange">{s.awaiting} orders</b></header><OrderTable d={d} rows={d.orders.filter((o:any)=>!o.fulfillment_status||o.fulfillment_status==="unfulfilled")}/></section>
    <section className="agency-card"><header><div><h2>Delivered</h2><p>Fulfilled orders</p></div><b className="green">{s.shipped} orders</b></header><OrderTable d={d} rows={d.orders.filter((o:any)=>o.fulfillment_status==="fulfilled")}/></section>
    <section className="agency-card"><header><div><h2>All Orders</h2><p>Complete order ledger</p></div><b>{d.orders.length} orders</b></header><OrderTable d={d} rows={d.orders}/></section>
  </>

  if(section==="products") content=<>
    <PageHeader/>
    <section className="agency-product-grid">{products.map((p:any,i:number)=><article className="agency-product-card" key={p.id}>
      <div className="agency-product-image">{p.image?<img src={p.image} alt=""/>:<span>PRODUCT</span>}{i===0&&<em>★ Top Earner</em>}</div>
      <div className="agency-product-body"><div className="agency-product-title"><strong>{p.title}</strong><span className="agency-pill active">Active</span></div><small>{p.price?money(p.price):"Campaign item"}</small>
      <div className="agency-product-stats"><div><span>Units</span><b>{p.qty}</b></div><div><span>Gross</span><b>{money(p.gross)}</b></div><div><span>Refunds</span><b className="red">{money(0)}</b></div><div><span>Raised</span><b className="green">{money(p.raised)}</b></div></div>
      <div className="agency-payout-rule"><span>Payout</span><b>{d.campaign?.fundraising_percentage||20}% of eligible sales</b></div></div>
    </article>)}</section>
  </>

  if(section==="progress") content=<>
    <PageHeader/>
    <section className="agency-grid-2">
      <article className="agency-card agency-goal-card"><header><div><h2>Fundraising Goal</h2><p>Progress toward fundraising target</p></div></header><div><strong>{money(s.raised)}</strong><span>of {money(goal)}</span><b>{pct.toFixed(1)}%</b></div><div className="agency-progress"><i style={{width:pct+"%"}}/></div></article>
      <article className="agency-card agency-goal-card"><header><div><h2>Sales Goal</h2><p>Progress toward total sales target</p></div></header><div><strong>{money(s.gross)}</strong><span>of {money(salesGoal)}</span><b>{salesPct.toFixed(1)}%</b></div><div className="agency-progress greenbar"><i style={{width:salesPct+"%"}}/></div></article>
    </section>
    <section className="agency-kpis four"><div><span>DAYS ELAPSED</span><strong>{start?Math.max(0,Math.ceil((Date.now()-start.getTime())/86400000)):0}</strong><small>campaign running</small></div><div><span>DAYS REMAINING</span><strong className="orange">{daysRemaining}</strong><small>days to go</small></div><div><span>REQUIRED DAILY SALES</span><strong>{money(daysRemaining?Math.max(0,salesGoal-s.gross)/daysRemaining:0)}</strong></div><div><span>AVG. DAILY SALES</span><strong className="green">{money(start? s.gross/Math.max(1,Math.ceil((Date.now()-start.getTime())/86400000)):0)}</strong></div></section>
    <section className="agency-card"><header><div><h2>Milestones</h2><p>Achievements unlocked this campaign</p></div></header><div className="agency-milestones"><div className="done"><b>⚑</b><strong>First order</strong><span>{d.orders.length?"ACHIEVED":"Waiting"}</span></div><div><b>◎</b><strong>$1,000 raised</strong><span>{money(s.raised)} / $1,000</span></div><div><b>↗</b><strong>100 orders</strong><span>{d.orders.length} / 100</span></div><div><b>♕</b><strong>50% of goal</strong><span>{pct.toFixed(1)}%</span></div></div></section>
  </>

  if(section==="payouts"||section==="payout-assistant") content=<>
    <PageHeader/>
    <div className="agency-notice">⚠ <b>Estimate notice:</b> Fundraising proceeds shown before payout approval are estimates. Final payout amounts may be adjusted for refunds, chargebacks, cancellations, taxes, shipping, discounts, or campaign-specific exclusions.</div>
    <section className="agency-kpis four"><div><span>TOTAL EARNED</span><strong>{money(d.payouts.reduce((a:number,p:any)=>a+Number(p.payout_amount||0),0))}</strong></div><div><span>TOTAL PAID</span><strong className="green">{money(d.payouts.filter((p:any)=>p.status==="paid").reduce((a:number,p:any)=>a+Number(p.payout_amount||0),0))}</strong></div><div><span>PENDING ADJUSTMENTS</span><strong>{money(0)}</strong></div><div><span>AVAILABLE FOR PAYOUT</span><strong>{money(d.payouts.filter((p:any)=>p.status==="approved").reduce((a:number,p:any)=>a+Number(p.payout_amount||0),0))}</strong></div></section>
    <section className="agency-grid-2"><article className="agency-card"><header><div><h2>Next Scheduled Payout</h2><p>Upcoming disbursement to your department</p></div></header><div className="agency-empty big">No scheduled payout<br/><span>Your next payout will appear here once approved.</span></div></article><article className="agency-card"><header><div><h2>Payout Method</h2><p>How your department receives funds</p></div></header><div className="agency-detail-list"><div><span>Method</span><b>{d.org.payout_method||"ACH"}</b></div><div><span>Contact</span><b>{d.org.payment_contact||d.org.contact_name||"—"}</b></div><div><span>Email</span><b>{d.org.contact_email||"—"}</b></div></div></article></section>
    <section className="agency-card"><header><div><h2>Payout Ledger</h2><p>Complete history of fundraising disbursements</p></div></header>{d.payouts.length?<div className="agency-table-wrap"><table className="agency-table"><thead><tr><th>DATE</th><th>STATUS</th><th>GROSS</th><th>CONTRIBUTION</th><th>PAYOUT</th></tr></thead><tbody>{d.payouts.map((p:any)=><tr key={p.id}><td>{new Date(p.created_at).toLocaleDateString()}</td><td><span className="agency-pill">{p.status}</span></td><td>{money(Number(p.gross_sales||0))}</td><td>{money(Number(p.contribution_amount||0))}</td><td><b>{money(Number(p.payout_amount||0))}</b></td></tr>)}</tbody></table></div>:<div className="agency-empty big">No payouts yet<br/><span>Payouts will appear here once your campaign generates approved proceeds.</span></div>}</section>
  </>

  if(section==="reports") content=<>
    <PageHeader/>
    <section className="agency-report-layout"><aside className="agency-card"><header><div><h2>Report Types</h2><p>Select a report to generate</p></div></header>{["Campaign Summary","Sales by Product","Order Summary","Payout Statement","Monthly Performance Report","Full Campaign Closeout Report"].map((x,i)=><button className={i===0?"active":""} key={x}>▤ <span><b>{x}</b><small>{i===0?"High-level overview of campaign performance and totals":"Detailed campaign reporting"}</small></span></button>)}</aside><article className="agency-card"><header><div><h2>Report Options</h2><p>Configure and generate your report</p></div></header><div className="agency-filter-row"><label>Date range<select><option>Last 60 days</option></select></label><label>Campaign<select><option>{d.campaign?.name||"Current"}</option></select></label></div><div className="agency-report-preview"><h3>Campaign Summary</h3><p>Includes department branding, campaign totals, order counts, and fundraising proceeds.</p><div><span>Records <b>{d.orders.length}</b></span><span>Campaign totals <b>{money(s.gross)} gross · {money(s.raised)} raised</b></span></div></div><div className="agency-actions"><button>↓ Download PDF</button><button>▤ Download CSV</button><button>▣ Print</button></div></article></section>
  </>

  if(section==="marketing") content=<>
    <PageHeader/>
    <section className="agency-grid-2"><article className="agency-card"><header><div><h2>Public Storefront Link</h2><p>Share your campaign collection page</p></div></header><div className="agency-copybox"><span>{d.campaign?.public_store_url||"Campaign storefront not set"}</span><button>Copy Link</button></div><div className="agency-info">⌁ Share this link anywhere your supporters are.</div></article><article className="agency-card"><header><div><h2>QR Code</h2><p>Use on flyers & signage</p></div></header><div className="agency-qr">QR</div><button className="agency-primary">Download QR</button></article></section>
    <section className="agency-grid-2"><article className="agency-card"><header><div><h2>Campaign Countdown Graphic</h2><p>Days remaining — ready to screenshot</p></div></header><div className="agency-social-card dark"><span>◷</span><strong>{daysRemaining}</strong><b>DAYS LEFT</b><small>{d.campaign?.name}</small></div></article><article className="agency-card"><header><div><h2>Fundraising Progress Graphic</h2><p>Share your momentum</p></div></header><div className="agency-social-card bluebg"><span>◎</span><strong>{pct.toFixed(1)}%</strong><b>OF GOAL REACHED</b><small>{money(s.raised)} of {money(goal)}</small></div></article></section>
    <section className="agency-grid-2"><article className="agency-card"><header><div><h2>Suggested Social Post</h2><p>Copy and paste to your channels</p></div></header><div className="agency-copytext">🚀 Support {d.org.name}! Our {d.campaign?.name} fundraiser is live. Every purchase helps our campaign. Shop now: {d.campaign?.public_store_url||"your campaign link"}</div></article><article className="agency-card"><header><div><h2>Suggested Email Copy</h2><p>Ready-to-send outreach template</p></div></header><div className="agency-copytext">Hi friends,<br/><br/>{d.org.name} is running the {d.campaign?.name} fundraiser. A portion of every eligible sale supports our department. We&apos;re currently at {pct.toFixed(1)}% of our {money(goal)} goal.</div></article></section>
  </>

  if(section==="help") content=<><PageHeader/><section className="agency-grid-2"><article className="agency-card"><header><div><h2>Common Questions</h2></div></header><div className="agency-detail-list"><div><span>How are fundraiser proceeds calculated?</span><b>{d.campaign?.fundraising_percentage||20}% of eligible sales</b></div><div><span>Where do customers shop?</span><b>Shopify storefront</b></div><div><span>When are payouts visible?</span><b>After approval</b></div></div></article><article className="agency-card"><header><div><h2>Need Help?</h2><p>Contact Detroit Decal & Apparel</p></div></header><div className="agency-empty big">Support for your campaign is available from the platform team.</div></article></section></>

  if(section==="settings") content=<><PageHeader/><section className="agency-grid-2"><article className="agency-card"><header><div><h2>Department Profile</h2></div></header><div className="agency-detail-list"><div><span>Organization</span><b>{d.org.name}</b></div><div><span>Contact</span><b>{d.org.contact_name||"—"}</b></div><div><span>Email</span><b>{d.org.contact_email||"—"}</b></div><div><span>Portal role</span><b>{d.memberRole||"Platform preview"}</b></div></div></article>{d.canManage&&<article className="agency-card"><header><div><h2>Access Management</h2><p>Control who can access this department portal</p></div></header><Link className="agency-primary-link" href={"/portal/members?org="+d.organizationId}>Manage Members →</Link></article>}</section></>

  return <PortalShell org={d.org} campaign={d.campaign} userEmail={d.user.email||""} organizationId={d.organizationId} platform={d.platform}>{content||<><PageHeader/><section className="agency-card"><div className="agency-empty big">This department tool is being prepared.</div></section></>}</PortalShell>
}

function OrderTable({d,rows}:{d:any;rows:any[]}){
  if(!rows.length) return <div className="agency-empty">No orders in this view.</div>
  return <div className="agency-table-wrap"><table className="agency-table"><thead><tr><th>ORDER #</th><th>DATE</th><th>ITEMS</th><th>GROSS</th><th>ELIGIBLE</th><th>REFUND</th><th>FUNDRAISING</th><th>PAYMENT</th><th>FULFILLMENT</th></tr></thead><tbody>{rows.map((o:any)=>{
    const oi=d.items.filter((i:any)=>i.order_id===o.id)
    const qty=oi.reduce((a:number,i:any)=>a+Number(i.quantity||0),0)
    const eligible=oi.reduce((a:number,i:any)=>a+Number(i.unit_price||0)*Number(i.quantity||0)-Number(i.refunded_merchandise_amount||0),0)
    const raised=oi.reduce((a:number,i:any)=>a+Number(i.contribution_amount||0)-Number(i.refunded_contribution_amount||0),0)
    return <tr key={o.id}><td><b>#{o.shopify_order_number||"—"}</b><small>{[o.customer_first_name,o.customer_last_initial].filter(Boolean).join(" ")}</small></td><td>{o.placed_at?new Date(o.placed_at).toLocaleDateString():"—"}</td><td>{qty}</td><td>{money(Number(o.subtotal||o.total||0))}</td><td>{money(eligible)}</td><td className="red">{money(Number(o.refund_amount||0))}</td><td className="green"><b>{money(raised)}</b></td><td><span className="agency-pill active">{o.status}</span></td><td><span className="agency-pill">{o.fulfillment_status||"Unfulfilled"}</span></td></tr>
  })}</tbody></table></div>
}
