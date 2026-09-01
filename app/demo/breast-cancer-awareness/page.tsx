"use client"

import Link from "next/link"
import { useEffect,useMemo,useRef,useState } from "react"
import QRCode from "qrcode"

const orders=[
  {order:"#1048",date:"Oct 18",customer:"Jamie R.",product:"BCA Awareness Tee",total:32,raised:6.4,payment:"Paid",fulfillment:"Unfulfilled"},
  {order:"#1047",date:"Oct 17",customer:"Taylor M.",product:"BCA Hoodie",total:52,raised:10.4,payment:"Paid",fulfillment:"Unfulfilled"},
  {order:"#1046",date:"Oct 16",customer:"Chris D.",product:"Duty Shirt - Pink Crest",total:38,raised:7.6,payment:"Paid",fulfillment:"Fulfilled"},
  {order:"#1045",date:"Oct 15",customer:"Morgan S.",product:"BCA Awareness Tee",total:32,raised:6.4,payment:"Paid",fulfillment:"Fulfilled"},
]
const products=[
  {name:"BCA Awareness Tee",sold:96,retail:32,raised:614.4},
  {name:"BCA Hoodie",sold:54,retail:52,raised:561.6},
  {name:"Duty Shirt - Pink Crest",sold:38,retail:38,raised:288.8},
  {name:"BCA Decal Pack",sold:26,retail:12,raised:62.4},
]
const members=[
  {name:"Chief Morgan",email:"chief@metrops.gov",role:"Owner",detail:"Full department control",status:"Active"},
  {name:"Lt. Rivera",email:"rivera@metrops.gov",role:"Admin",detail:"Campaigns, members and reporting",status:"Active"},
  {name:"FF Carter",email:"carter@metrops.gov",role:"Manager",detail:"Orders and campaign operations",status:"Active"},
  {name:"Finance Review",email:"finance@metrops.gov",role:"Viewer",detail:"Read-only reporting",status:"Invite Pending"},
]
const tabs=["Overview","Sales","Orders","Products","Campaign Progress","Payouts","Reports","Marketing","Members"]

function money(v:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(v)}
function downloadCsv(){
  const rows=[["Order","Date","Customer","Product","Total","Raised","Payment","Fulfillment"],...orders.map(o=>[o.order,o.date,o.customer,o.product,o.total,o.raised,o.payment,o.fulfillment])]
  const csv=rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(",")).join("\n")
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="bca-demo-orders.csv";a.click();URL.revokeObjectURL(a.href)
}

export default function BreastCancerDemo(){
  const [tab,setTab]=useState("Overview")
  const [mobileMenuOpen,setMobileMenuOpen]=useState(false)
  const [range,setRange]=useState(30)
  const [search,setSearch]=useState("")
  const [copied,setCopied]=useState("")
  const [payoutState,setPayoutState]=useState<"available"|"requested">("available")
  const [reportType,setReportType]=useState("Campaign Summary")
  const [marketingView,setMarketingView]=useState<"links"|"graphics"|"copy">("links")
  const [memberNotice,setMemberNotice]=useState("")
  const qr=useRef<HTMLCanvasElement>(null)

  const demoUrl="https://fundraising-command-app.vercel.app/demo/breast-cancer-awareness"
  useEffect(()=>{if(qr.current)QRCode.toCanvas(qr.current,demoUrl,{width:170,margin:1,color:{dark:"#0b1f33",light:"#ffffff"}})},[])
  const filtered=orders.filter(o=>(o.order+" "+o.customer+" "+o.product).toLowerCase().includes(search.toLowerCase()))
  const copy=(text:string,label:string)=>navigator.clipboard?.writeText(text).then(()=>{setCopied(label);setTimeout(()=>setCopied(""),1500)})
  const pct=67.7
  const daysRemaining=13
  const reportRows=useMemo(()=>reportType==="Sales by Product"?products.map(p=>[p.name,p.sold,money(p.retail*p.sold),money(p.raised)]):orders.map(o=>[o.order,o.date,o.customer,money(o.total),money(o.raised)]),[reportType])

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
        <div className="bca2-top-actions">
          <div className="bca2-campaign"><span>◎</span><div><strong>October 2026</strong><small>Sep 1 — Oct 31 · {daysRemaining} days left</small></div><b>DEMO</b></div>
          <div className="bca2-sync"><span>↻</span><div><small>DATA SOURCE</small><strong>Sample Shopify-style data</strong></div></div>
          <div className="bca2-avatar">MP</div>
        </div>
      </header>

      <main className="bca2-content">
        <div className="bca2-page-head"><div><h1>{tab}</h1></div><div className="bca2-head-actions"><Link href="/apply">Start a Campaign</Link><button onClick={()=>copy(window.location.href,"Demo link copied")}>{copied||"Share Demo"}</button></div></div>

        {tab==="Overview"&&<>
          <section className="bca2-hero"><span>Welcome back,</span><h2>Chief Morgan</h2><div><b>◎ Viewing Campaign: October 2026</b><b>▣ Runs Sep 1 — Oct 31, 2026</b><em>Active</em><em>◉ Shopify-connected workflow</em></div></section>
          <section className="bca2-kpis"><div><span>GROSS SALES</span><strong>$8,460</strong><small>campaign merchandise</small></div><div><span>NET ELIGIBLE SALES</span><strong className="blue">$8,460</strong><small>after eligible adjustments</small></div><div><span>EST. FUNDRAISING</span><strong className="orange">$1,692</strong><small>20% contribution</small></div><div><span>ORDERS</span><strong>214</strong><small>196 fulfilled</small></div><div><span>ITEMS SOLD</span><strong>268</strong><small>campaign items</small></div><div><span>AVG. ORDER VALUE</span><strong>$39.53</strong><small>campaign average</small></div><div><span>AVAILABLE FOR PAYOUT</span><strong className="green">$444</strong><small>currently requestable</small></div><div><span>AWAITING FULFILLMENT</span><strong className="orange">18</strong><small>pending shipment</small></div></section>
          <section className="bca2-grid">
            <article className="bca2-card"><header><div><h3>Sales Over Time</h3><p>Shopify-backed campaign activity</p></div><span className="bca2-live-pill">LIVE</span></header><div className="bca2-demo-chart"><svg viewBox="0 0 600 220"><line x1="40" y1="180" x2="570" y2="180" stroke="#e8edf3"/><line x1="40" y1="130" x2="570" y2="130" stroke="#eef2f6"/><line x1="40" y1="80" x2="570" y2="80" stroke="#eef2f6"/><polygon points="55,155 190,128 330,105 455,75 555,52 555,180 55,180" fill="rgba(13,104,190,.08)"/><polyline points="55,155 190,128 330,105 455,75 555,52" fill="none" stroke="#0d68be" strokeWidth="4"/>{[[55,155],[190,128],[330,105],[455,75],[555,52]].map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="5" fill="#0d68be"/>)}</svg></div></article>
            <article className="bca2-card"><header><div><h3>Fundraising Goal</h3><p>Progress toward the $2,500 target</p></div></header><div className="bca2-ring"><div><strong>{pct}%</strong><span>of goal</span></div></div><div className="bca2-detail"><div><span>Raised</span><b className="green">$1,692</b></div><div><span>Goal</span><b>$2,500</b></div><div><span>Days Left</span><b>{daysRemaining}</b></div></div></article>
          </section>
          <section className="bca2-card bca2-timeline-card"><header><div><h3>Campaign Timeline</h3><p>Date-driven countdowns update throughout the portal.</p></div><b>{daysRemaining} days remaining</b></header><div className="bca2-timeline"><span>Sep 1</span><div><i style={{width:"79%"}}/></div><span>Oct 31</span></div></section>
        </>}

        {tab==="Sales"&&<>
          <section className="bca2-card"><header><div><h3>Sales Filters</h3><p>Change the reporting window and narrow campaign activity.</p></div></header><div className="bca2-filter"><div><label>Date range</label><div className="bca2-tabs">{[7,30,60,90].map(n=><button key={n} className={range===n?"active":""} onClick={()=>setRange(n)}>{n} days</button>)}</div></div><label>Product<select><option>All products</option>{products.map(p=><option key={p.name}>{p.name}</option>)}</select></label><label>Payment<select><option>All statuses</option><option>Paid</option><option>Refunded</option></select></label></div></section>
          <section className="bca2-kpis four"><div><span>GROSS SALES</span><strong>$8,460</strong></div><div><span>NET ELIGIBLE</span><strong>$8,460</strong></div><div><span>FUNDRAISING</span><strong className="orange">$1,692</strong></div><div><span>AVG. ORDER</span><strong>$39.53</strong></div></section>
          <section className="bca2-card"><header><div><h3>Sales by Product</h3><p>{range}-day campaign view</p></div></header><ProductTable/></section>
        </>}

        {tab==="Orders"&&<>
          <div className="bca2-page-actions"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order #, customer, or product..."/><button onClick={downloadCsv}>↓ Export CSV</button></div>
          <section className="bca2-card"><header><div><h3>Order Ledger</h3><p>Search, review, and export campaign orders.</p></div><b>{filtered.length} shown</b></header><OrdersTable rows={filtered}/></section>
        </>}

        {tab==="Products"&&<section className="bca2-product-grid">{products.map((p,i)=><article className="bca2-product" key={p.name}><div className="bca2-product-art">{i===0&&<em>★ Top Earner</em>}<span>{i===0?"TEE":i===1?"HOODIE":i===2?"DUTY":"DECAL"}</span></div><div><div className="bca2-product-title"><strong>{p.name}</strong><span>Active</span></div><small>{money(p.retail)}</small><div className="bca2-product-stats"><div><span>Units</span><b>{p.sold}</b></div><div><span>Raised</span><b className="green">{money(p.raised)}</b></div></div><div className="bca2-rule">20% of eligible sales</div></div></article>)}</section>}

        {tab==="Campaign Progress"&&<>
          <section className="bca2-grid">
            <article className="bca2-card bca2-goal"><header><div><h3>Fundraising Goal</h3></div></header><div><strong>$1,692</strong><span>of $2,500</span><b>{pct}%</b></div><div className="bca2-progress"><i style={{width:pct+"%"}}/></div></article>
            <article className="bca2-card bca2-goal"><header><div><h3>Campaign Timeline</h3></div></header><div><strong>{daysRemaining}</strong><span>days remaining</span><b>79%</b></div><div className="bca2-progress greenbar"><i style={{width:"79%"}}/></div></article>
          </section>
          <section className="bca2-card"><header><div><h3>Milestones</h3><p>Campaign achievements and next target</p></div></header><div className="bca2-milestones"><div className="done">First order <b>ACHIEVED</b></div><div>$1,000 raised <b>ACHIEVED</b></div><div>100 orders <b>ACHIEVED</b></div><div>75% of goal <b>NEXT</b></div></div></section>
        </>}

        {tab==="Payouts"&&<>
          <div className="bca2-notice">ⓘ <b>Payout accounting:</b> Requests are reconciled against unpaid campaign order items before approval.</div>
          <section className="bca2-kpis four"><div><span>TOTAL EARNED</span><strong>$1,692</strong></div><div><span>TOTAL PAID</span><strong className="green">$1,248</strong></div><div><span>AVAILABLE</span><strong>$444</strong></div><div><span>MINIMUM</span><strong>$250</strong></div></section>
          <section className="bca2-grid">
            <article className="bca2-card bca2-request-demo"><header><div><h3>Request a Payout</h3><p>Owners and Admins can submit available proceeds for review.</p></div></header>{payoutState==="available"?<><div className="bca2-request-amount"><span>Currently eligible</span><strong>$444.00</strong><small>Minimum threshold: $250.00</small></div><textarea placeholder="Optional note to payout reviewer"/><button onClick={()=>setPayoutState("requested")}>Request $444.00 Payout</button></>:<div className="bca2-requested"><span>REQUESTED</span><strong>$444.00</strong><p>Waiting for platform review. This request is now tracked in payout history.</p></div>}</article>
            <article className="bca2-card"><header><div><h3>Payout Request History</h3><p>Request status stays separate from the payout ledger.</p></div></header><div className="bca2-payouts"><div><span>Oct 18, 2026</span><b>{payoutState==="requested"?"Requested":"Available"}</b><strong>$444</strong></div><div><span>Sep 30, 2026</span><b>Paid</b><strong>$1,248</strong></div></div></article>
          </section>
          <section className="bca2-card"><header><div><h3>Payout Ledger</h3><p>Approved disbursement records and payment status.</p></div></header><div className="bca2-payouts"><div><span>Sep 2026 · ACH ending 2841</span><b>Paid</b><strong>$1,248</strong></div></div></section>
        </>}

        {tab==="Reports"&&<section className="bca2-report-layout">
          <aside className="bca2-card"><header><div><h3>Report Types</h3><p>Professional campaign exports</p></div></header>{["Campaign Summary","Sales by Product","Order Summary","Payout Statement","Monthly Performance","Full Campaign Closeout"].map(r=><button onClick={()=>setReportType(r)} className={reportType===r?"active":""} key={r}>▤ {r}</button>)}</aside>
          <article className="bca2-card bca2-pro-report"><header><div><h3>Report Preview</h3><p>Branded PDF, CSV, and print-ready output.</p></div><span className="bca2-live-pill">LIVE DATA</span></header>
            <div className="bca2-report-sheet-demo"><div className="top"><div><strong>FUNDRAISER COMMAND</strong><span>METRO PUBLIC SAFETY</span></div><b>{reportType}</b></div><div className="title"><span>OCTOBER 2026</span><h4>{reportType}</h4><p>Metro Public Safety · Breast Cancer Awareness Campaign</p></div><div className="kpis"><div><span>Gross Sales</span><b>$8,460</b></div><div><span>Fundraising</span><b>$1,692</b></div><div><span>Orders</span><b>214</b></div></div><div className="rows">{reportRows.slice(0,4).map((r,i)=><div key={i}>{r.map((v,j)=><span key={j}>{v}</span>)}</div>)}</div></div>
            <div className="bca2-report-actions"><button onClick={()=>window.print()}>↓ Download Professional PDF</button><button onClick={downloadCsv}>Download CSV</button><button onClick={()=>window.print()}>Print</button></div>
          </article>
        </section>}

        {tab==="Marketing"&&<>
          <section className="bca2-marketing-hero"><div><span>MARKETING CENTER</span><h2>October BCA Campaign</h2><p>13 days remaining · 67.7% of goal · campaign promotion tools ready</p></div><b>LIVE CAMPAIGN</b></section>
          <div className="bca2-marketing-tabs"><button className={marketingView==="links"?"active":""} onClick={()=>setMarketingView("links")}>Tracking & QR</button><button className={marketingView==="graphics"?"active":""} onClick={()=>setMarketingView("graphics")}>Graphics</button><button className={marketingView==="copy"?"active":""} onClick={()=>setMarketingView("copy")}>Copy & Reminders</button></div>
          {marketingView==="links"&&<><section className="bca2-kpis four"><div><span>FACEBOOK CLICKS</span><strong>148</strong></div><div><span>INSTAGRAM</span><strong>96</strong></div><div><span>EMAIL</span><strong>63</strong></div><div><span>QR SCANS</span><strong>41</strong></div></section><section className="bca2-grid"><article className="bca2-card"><header><div><h3>Tracked Campaign Links</h3><p>Channel links show what is actually driving traffic.</p></div></header><div className="bca2-tracked-links">{["Facebook","Instagram","Email","QR"].map(x=><div key={x}><span>{x}</span><code>fundraising-command.app/m/{x.toLowerCase()}</code><button onClick={()=>copy(demoUrl,x+" link copied")}>Copy</button></div>)}</div></article><article className="bca2-card"><header><div><h3>QR Code</h3><p>Download for flyers, signs, and events.</p></div></header><div className="bca2-qr"><canvas ref={qr}/><button onClick={()=>copy(demoUrl,"QR link copied")}>Copy QR Link</button></div></article></section></>}
          {marketingView==="graphics"&&<><section className="bca2-card"><header><div><h3>Campaign Graphics</h3><p>Prebuilt assets using campaign dates, progress, and product data.</p></div></header><div className="bca2-demo-assets"><div className="square"><small>METRO PUBLIC SAFETY</small><strong>68%</strong><span>OF GOAL</span><b>BCA FUNDRAISER</b></div><div className="story"><small>FINAL WEEK</small><strong>13</strong><span>DAYS LEFT</span><b>SHOP THE CAMPAIGN</b></div><div className="product"><small>CAMPAIGN FAVORITE</small><strong>TEE</strong><span>BCA Awareness Tee</span><b>$32 · 96 SOLD</b></div><div className="milestone"><small>MILESTONE</small><strong>75%</strong><span>COMING UP</span><b>KEEP IT GOING</b></div></div></section></>}
          {marketingView==="copy"&&<section className="bca2-grid"><article className="bca2-card"><header><div><h3>Ready-to-Send Copy</h3><p>Messaging shifts automatically in the final week.</p></div><button onClick={()=>copy("FINAL WEEK: Metro Public Safety's BCA fundraiser ends soon. Help us finish strong! "+demoUrl,"Copied")}>Copy</button></header><div className="bca2-copytext"><b>FINAL WEEK:</b> Metro Public Safety&apos;s BCA fundraiser ends soon. Help us finish strong and reach our goal before October 31.</div><div className="bca2-saved-template">Saved templates <span>Launch Post</span><span>Community Email</span><span>Final Week Push</span></div></article><article className="bca2-card"><header><div><h3>Promotion Reminders</h3><p>Date-driven campaign cadence</p></div></header><div className="bca2-reminders"><div><b>Sep 1</b><span>Launch Day</span><em>DONE</em></div><div><b>Oct 1</b><span>Halfway Check-In</span><em>DONE</em></div><div><b>Oct 24</b><span>7 Days Remaining</span><em>UPCOMING</em></div><div><b>Oct 29</b><span>Final 48 Hours</span><em>UPCOMING</em></div></div></article></section>}
        </>}

        {tab==="Members"&&<section className="bca2-card"><header><div><h3>Department Access</h3><p>Owners and Admins control roles, invite status, and access.</p></div><strong>{members.length} users</strong></header><div className="bca2-member-list">{members.map(m=><div key={m.name}><div><strong>{m.name}</strong><small>{m.email} · {m.detail}</small></div><span>{m.role}</span><em className={m.status==="Active"?"active":"pending"}>{m.status}</em>{m.status!=="Active"&&<button onClick={()=>{setMemberNotice("Fresh invitation sent to "+m.email);setTimeout(()=>setMemberNotice(""),1800)}}>Resend Invite</button>}</div>)}</div>{memberNotice&&<div className="bca2-member-notice">{memberNotice}</div>}</section>}

        <section className="bca-callout bca2-bottom-banner">
          <div><span>BUILT FOR FIRE · POLICE · EMS</span><h2>Give your department a fundraiser it can actually manage.</h2><p>Shopify order sync, date-driven campaign tracking, payout requests, professional reports, tracked marketing links, campaign graphics, member invitations, and fundraising visibility — all in one department portal.</p></div>
          <Link href="/apply">Build This for My Department →</Link>
        </section>
      </main>
    </div>
  </div>
}

function OrdersTable({rows}:{rows:typeof orders}){
  return <div className="bca2-table-wrap"><table className="bca2-table"><thead><tr><th>ORDER</th><th>DATE</th><th>CUSTOMER</th><th>PRODUCT</th><th>TOTAL</th><th>RAISED</th><th>PAYMENT</th><th>FULFILLMENT</th></tr></thead><tbody>{rows.map(o=><tr key={o.order}><td><b>{o.order}</b></td><td>{o.date}</td><td>{o.customer}</td><td>{o.product}</td><td>{money(o.total)}</td><td className="green"><b>{money(o.raised)}</b></td><td><span>{o.payment}</span></td><td>{o.fulfillment}</td></tr>)}</tbody></table></div>
}
function ProductTable(){
  return <div className="bca2-table-wrap"><table className="bca2-table"><thead><tr><th>PRODUCT</th><th>SOLD</th><th>RETAIL</th><th>GROSS</th><th>FUNDRAISING</th></tr></thead><tbody>{products.map(p=><tr key={p.name}><td><b>{p.name}</b></td><td>{p.sold}</td><td>{money(p.retail)}</td><td>{money(p.retail*p.sold)}</td><td className="green"><b>{money(p.raised)}</b></td></tr>)}</tbody></table></div>
}
