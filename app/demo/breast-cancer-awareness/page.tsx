"use client"

import Link from "next/link"
import { useEffect,useRef,useState } from "react"
import QRCode from "qrcode"

const orders=[
  {order:"#1048",customer:"Jamie R.",product:"BCA Awareness Tee",total:32,raised:6.4,payment:"Paid",fulfillment:"Unfulfilled"},
  {order:"#1047",customer:"Taylor M.",product:"BCA Hoodie",total:52,raised:10.4,payment:"Paid",fulfillment:"Unfulfilled"},
  {order:"#1046",customer:"Chris D.",product:"Duty Shirt - Pink Crest",total:38,raised:7.6,payment:"Paid",fulfillment:"Fulfilled"},
  {order:"#1045",customer:"Morgan S.",product:"BCA Awareness Tee",total:32,raised:6.4,payment:"Paid",fulfillment:"Fulfilled"},
]
const products=[
  {name:"BCA Awareness Tee",sold:96,retail:32,raised:614.4},
  {name:"BCA Hoodie",sold:54,retail:52,raised:561.6},
  {name:"Duty Shirt - Pink Crest",sold:38,retail:38,raised:288.8},
  {name:"BCA Decal Pack",sold:26,retail:12,raised:62.4},
]
const members=[
  ["Chief Morgan","Owner","Full department control"],
  ["Lt. Rivera","Admin","Campaigns, members and reporting"],
  ["FF Carter","Manager","Orders and campaign operations"],
  ["Finance Review","Viewer","Read-only reporting"],
]
const tabs=["Overview","Sales","Orders","Products","Campaign Progress","Payouts","Reports","Marketing","Members"]

function money(v:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(v)}
function downloadCsv(){
  const rows=[["Order","Customer","Product","Total","Raised","Payment","Fulfillment"],...orders.map(o=>[o.order,o.customer,o.product,o.total,o.raised,o.payment,o.fulfillment])]
  const csv=rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(",")).join("\n")
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="bca-demo-orders.csv";a.click();URL.revokeObjectURL(a.href)
}

export default function BreastCancerDemo(){
  const [tab,setTab]=useState("Overview")
  const [mobileMenuOpen,setMobileMenuOpen]=useState(false)
  const [range,setRange]=useState(60)
  const [search,setSearch]=useState("")
  const [copied,setCopied]=useState("")
  const qr=useRef<HTMLCanvasElement>(null)
  const demoUrl="https://fundraising-command-app.vercel.app/demo/breast-cancer-awareness"
  useEffect(()=>{if(qr.current)QRCode.toCanvas(qr.current,demoUrl,{width:170,margin:1})},[])
  const filtered=orders.filter(o=>(o.order+" "+o.customer+" "+o.product).toLowerCase().includes(search.toLowerCase()))
  const copy=(text:string,label:string)=>navigator.clipboard?.writeText(text).then(()=>{setCopied(label);setTimeout(()=>setCopied(""),1500)})
  const pct=67.7

  return <div className="bca2-shell">
    <aside className="bca2-sidebar">
      <div className="bca2-wordmark"><strong>Fundraiser Command</strong><span>DETROIT DECAL & APPAREL</span></div>
      <div className="bca2-demo-badge">BREAST CANCER DEMO</div>
      <button className="bca2-mobile-menu-toggle" onClick={()=>setMobileMenuOpen(v=>!v)} aria-expanded={mobileMenuOpen}>{mobileMenuOpen?"Close Menu":"Menu · "+tab}</button>
      <nav className={mobileMenuOpen?"mobile-open":""}>{tabs.map(t=><button key={t} className={tab===t?"active":""} onClick={()=>{setTab(t);setMobileMenuOpen(false)}}>{t}</button>)}</nav>
      <div className="bca2-bottom"><span>Sample department portal</span><Link href="/">Exit Demo ↗</Link></div>
    </aside>

    <div className="bca2-workspace">
      <header className="bca2-topbar">
        <div className="bca2-org"><div className="bca2-org-mark">MPS</div><div><strong>Metro Public Safety</strong><span>Agency Portal · Demo</span></div></div>
        <div className="bca2-top-actions"><div className="bca2-campaign"><span>◎</span><div><strong>October 2026</strong><small>Active</small></div><b>DEMO</b></div><div className="bca2-sync"><span>↻</span><div><small>DATA SOURCE</small><strong>Sample Shopify-style data</strong></div></div><div className="bca2-avatar">MP</div></div>
      </header>

      <main className="bca2-content">
        <div className="bca2-page-head"><div><h1>{tab}</h1><p>See how a department manages fundraising without access to the platform back end.</p></div><div className="bca2-head-actions"><Link href="/apply">Start a Campaign</Link><button onClick={()=>copy(window.location.href,"Demo link copied")}>{copied||"Share Demo"}</button></div></div>

        {tab==="Overview"&&<>
          <section className="bca2-hero"><span>Welcome back,</span><h2>Chief Morgan</h2><div><b>◎ Viewing Campaign: October 2026</b><b>▣ Runs Sep 1 — Oct 31, 2026</b><em>Active</em><em>◉ Shopify-connected workflow</em></div></section>
          <section className="bca2-kpis"><div><span>GROSS SALES</span><strong>$8,460</strong><small>sample campaign data</small></div><div><span>NET ELIGIBLE SALES</span><strong className="blue">$8,460</strong><small>after eligible adjustments</small></div><div><span>EST. FUNDRAISING</span><strong className="orange">$1,692</strong><small>20% contribution</small></div><div><span>ORDERS</span><strong>214</strong><small>196 fulfilled</small></div><div><span>ITEMS SOLD</span><strong>268</strong><small>campaign items</small></div><div><span>AVG. ORDER VALUE</span><strong>$39.53</strong><small>sample average</small></div><div><span>AVAILABLE FOR PAYOUT</span><strong className="green">$1,248</strong><small>approved amount</small></div><div><span>AWAITING FULFILLMENT</span><strong className="orange">18</strong><small>pending shipment</small></div></section>
          <section className="bca2-grid"><article className="bca2-card"><header><div><h3>Sales Over Time</h3><p>What the live portal chart looks like</p></div></header><div className="bca2-demo-chart"><svg viewBox="0 0 600 220"><line x1="40" y1="180" x2="570" y2="180" stroke="#e8edf3"/><line x1="40" y1="130" x2="570" y2="130" stroke="#eef2f6"/><line x1="40" y1="80" x2="570" y2="80" stroke="#eef2f6"/><polygon points="55,155 190,128 330,105 455,75 555,52 555,180 55,180" fill="rgba(13,104,190,.08)"/><polyline points="55,155 190,128 330,105 455,75 555,52" fill="none" stroke="#0d68be" strokeWidth="4"/>{[[55,155],[190,128],[330,105],[455,75],[555,52]].map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="5" fill="#0d68be"/>)}</svg></div></article><article className="bca2-card"><header><div><h3>Fundraising Goal</h3><p>Progress toward campaign target</p></div></header><div className="bca2-ring"><div><strong>{pct}%</strong><span>of goal</span></div></div><div className="bca2-detail"><div><span>Raised</span><b className="green">$1,692</b></div><div><span>Goal</span><b>$2,500</b></div><div><span>Remaining</span><b>$808</b></div></div></article></section>
        </>}

        {tab==="Sales"&&<>
          <section className="bca2-card"><header><div><h3>Filters</h3><p>The production portal now filters real Shopify-backed data.</p></div></header><div className="bca2-filter"><div><label>Date range</label><div className="bca2-tabs">{[7,30,60,90].map(n=><button key={n} className={range===n?"active":""} onClick={()=>setRange(n)}>{n} days</button>)}</div></div><label>Product<select><option>All products</option>{products.map(p=><option key={p.name}>{p.name}</option>)}</select></label><label>Payment<select><option>All statuses</option><option>Paid</option><option>Refunded</option></select></label></div></section>
          <section className="bca2-kpis four"><div><span>GROSS SALES</span><strong>$8,460</strong></div><div><span>NET ELIGIBLE</span><strong>$8,460</strong></div><div><span>FUNDRAISING</span><strong className="orange">$1,692</strong></div><div><span>AVG. ORDER</span><strong>$39.53</strong></div></section>
          <section className="bca2-card"><header><div><h3>Sales by Product</h3><p>Sample breakdown for the demo</p></div></header><ProductTable/></section>
        </>}

        {tab==="Orders"&&<>
          <div className="bca2-page-actions"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order #, customer, or product..."/><button onClick={downloadCsv}>↓ Export CSV</button></div>
          <section className="bca2-card"><header><div><h3>Order Ledger</h3><p>Search and export are functional in this demo.</p></div><b>{filtered.length} orders</b></header><OrdersTable rows={filtered}/></section>
        </>}

        {tab==="Products"&&<section className="bca2-product-grid">{products.map((p,i)=><article className="bca2-product" key={p.name}><div className="bca2-product-art">{i===0&&<em>★ Top Earner</em>}BCA</div><div><div className="bca2-product-title"><strong>{p.name}</strong><span>Active</span></div><small>{money(p.retail)}</small><div className="bca2-product-stats"><div><span>Units</span><b>{p.sold}</b></div><div><span>Raised</span><b className="green">{money(p.raised)}</b></div></div><div className="bca2-rule">20% of eligible sales</div></div></article>)}</section>}

        {tab==="Campaign Progress"&&<><section className="bca2-grid"><article className="bca2-card bca2-goal"><header><div><h3>Fundraising Goal</h3></div></header><div><strong>$1,692</strong><span>of $2,500</span><b>{pct}%</b></div><div className="bca2-progress"><i style={{width:pct+"%"}}/></div></article><article className="bca2-card bca2-goal"><header><div><h3>Sales Goal</h3></div></header><div><strong>$8,460</strong><span>of $12,500</span><b>67.7%</b></div><div className="bca2-progress greenbar"><i style={{width:"67.7%"}}/></div></article></section><section className="bca2-card"><header><div><h3>Milestones</h3><p>Achievements unlocked this campaign</p></div></header><div className="bca2-milestones"><div className="done">First order <b>ACHIEVED</b></div><div>$1,000 raised <b>ACHIEVED</b></div><div>100 orders <b>ACHIEVED</b></div><div>75% of goal <b>Next</b></div></div></section></>}

        {tab==="Payouts"&&<><div className="bca2-notice">⚠ <b>Estimate notice:</b> Preliminary fundraising totals are estimates until payout approval.</div><section className="bca2-kpis four"><div><span>TOTAL EARNED</span><strong>$1,692</strong></div><div><span>TOTAL PAID</span><strong className="green">$1,248</strong></div><div><span>PENDING</span><strong>$444</strong></div><div><span>AVAILABLE</span><strong>$444</strong></div></section><section className="bca2-card"><header><div><h3>Payout Ledger</h3><p>Departments see approved and paid disbursements here.</p></div></header><div className="bca2-payouts"><div><span>Sep 2026</span><b>Paid</b><strong>$1,248</strong></div><div><span>Oct 2026</span><b>Pending</b><strong>$444</strong></div></div></section></>}

        {tab==="Reports"&&<section className="bca2-report-layout"><aside className="bca2-card"><header><div><h3>Report Types</h3></div></header>{["Campaign Summary","Sales by Product","Order Summary","Payout Statement","Monthly Performance"].map((r,i)=><button className={i===0?"active":""} key={r}>▤ {r}</button>)}</aside><article className="bca2-card"><header><div><h3>Report Options</h3><p>The production portal now supports PDF, CSV, and Print.</p></div></header><div className="bca2-report-preview"><h4>Campaign Summary</h4><p>Metro Public Safety · October 2026</p><div><span>214 orders</span><b>$8,460 gross · $1,692 raised</b></div></div><div className="bca2-report-actions"><button onClick={()=>window.print()}>Print Demo</button><button onClick={downloadCsv}>Download CSV</button></div></article></section>}

        {tab==="Marketing"&&<><section className="bca2-grid"><article className="bca2-card"><header><div><h3>Campaign Link</h3><p>Copy and share the storefront.</p></div></header><div className="bca2-copyrow"><code>fundraisingcommand.com/metro-bca</code><button onClick={()=>copy("https://fundraisingcommand.com/metro-bca","Copied")}>{copied||"Copy"}</button></div></article><article className="bca2-card"><header><div><h3>QR Code</h3><p>The production portal generates downloadable QR codes.</p></div></header><div className="bca2-qr"><canvas ref={qr}/></div></article></section><section className="bca2-card"><header><div><h3>Suggested Social Copy</h3></div><button onClick={()=>copy("Support Metro Public Safety's Breast Cancer Awareness fundraiser! Shop the campaign and help us reach our goal.","Copied")}>Copy</button></header><div className="bca2-copytext">Support Metro Public Safety&apos;s Breast Cancer Awareness fundraiser! Shop the campaign and help us reach our goal.</div></section></>}

        {tab==="Members"&&<section className="bca2-card"><header><div><h3>Department Access</h3><p>Owners and Admins control who can access the organization.</p></div><strong>{members.length} users</strong></header><div className="bca2-member-list">{members.map(m=><div key={m[0]}><div><strong>{m[0]}</strong><small>{m[2]}</small></div><span>{m[1]}</span></div>)}</div></section>}

        <section className="bca-callout bca2-bottom-banner">
          <div><span>BUILT FOR FIRE · POLICE · EMS</span><h2>Give your department a fundraiser it can actually manage.</h2><p>Real Shopify order sync, live campaign reporting, searchable orders, functional exports, QR marketing tools, contribution tracking, member access and payout visibility — all in one department portal.</p></div>
          <Link href="/apply">Build This for My Department →</Link>
        </section>
      </main>
    </div>
  </div>
}

function OrdersTable({rows}:{rows:typeof orders}){
  return <div className="bca2-table-wrap"><table className="bca2-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>PRODUCT</th><th>TOTAL</th><th>RAISED</th><th>PAYMENT</th><th>FULFILLMENT</th></tr></thead><tbody>{rows.map(o=><tr key={o.order}><td><b>{o.order}</b></td><td>{o.customer}</td><td>{o.product}</td><td>{money(o.total)}</td><td className="green"><b>{money(o.raised)}</b></td><td><span>{o.payment}</span></td><td>{o.fulfillment}</td></tr>)}</tbody></table></div>
}
function ProductTable(){
  return <div className="bca2-table-wrap"><table className="bca2-table"><thead><tr><th>PRODUCT</th><th>SOLD</th><th>RETAIL</th><th>FUNDRAISING</th></tr></thead><tbody>{products.map(p=><tr key={p.name}><td><b>{p.name}</b></td><td>{p.sold}</td><td>{money(p.retail)}</td><td className="green"><b>{money(p.raised)}</b></td></tr>)}</tbody></table></div>
}
