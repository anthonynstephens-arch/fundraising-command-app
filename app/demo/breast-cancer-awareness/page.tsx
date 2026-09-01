"use client"

import Link from "next/link"
import { useState } from "react"

const orders=[
  ["#1048","Jamie R.","BCA Awareness Tee","$32.00","Paid"],
  ["#1047","Taylor M.","BCA Hoodie","$52.00","Paid"],
  ["#1046","Chris D.","Duty Shirt - Pink Crest","$38.00","Paid"],
  ["#1045","Morgan S.","BCA Awareness Tee","$32.00","Paid"],
]

const products=[
  ["BCA Awareness Tee","96 sold","$32.00","$614.40 raised"],
  ["BCA Hoodie","54 sold","$52.00","$561.60 raised"],
  ["Duty Shirt - Pink Crest","38 sold","$38.00","$288.80 raised"],
  ["BCA Decal Pack","26 sold","$12.00","$62.40 raised"],
]

const members=[
  ["Chief Morgan","Owner","Full department control"],
  ["Lt. Rivera","Admin","Campaigns, members and reporting"],
  ["FF Carter","Manager","Orders and campaign operations"],
  ["Finance Review","Viewer","Read-only reporting"],
]

const tabs=["Overview","Sales","Orders","Products","Marketing","Payouts","Members"]

export default function BreastCancerDemo(){
  const [tab,setTab]=useState("Overview")

  return <div className="bca-demo">
    <aside className="bca-sidebar">
      <div className="bca-logo"><span>FC</span><div><strong>Metro Public Safety</strong><small>Breast Cancer Awareness</small></div></div>
      <nav>{tabs.map(t=><button key={t} className={tab===t?"active":""} onClick={()=>setTab(t)}>{t}</button>)}</nav>
      <div className="bca-foot"><span>October 2026 Campaign</span><Link href="/">Exit Demo ↗</Link></div>
    </aside>

    <main className="bca-main">
      <header className="bca-head">
        <div><span>BREAST CANCER AWARENESS DEMO</span><h1>{tab}</h1><p>This is the department-facing side of Fundraising Command — simple, focused, and limited to that department.</p></div>
        <div className="bca-head-actions"><Link href="/apply" className="bca-secondary">Start a Campaign</Link><button onClick={()=>navigator.clipboard?.writeText(window.location.href)}>Share Demo</button></div>
      </header>

      {tab==="Overview"&&<>
        <section className="bca-stats">
          <div><span>Total Sales</span><strong>$8,460</strong><small>+18% this week</small></div>
          <div><span>Funds Raised</span><strong>$1,692</strong><small>20% contribution</small></div>
          <div><span>Orders</span><strong>214</strong><small>196 fulfilled</small></div>
          <div><span>Goal Progress</span><strong>68%</strong><small>$1,692 of $2,500</small></div>
        </section>
        <section className="bca-grid">
          <article className="bca-card bca-progress-card">
            <div className="bca-card-head"><div><span>GOAL</span><h2>Fundraiser Progress</h2></div><strong>$1,692</strong></div>
            <div className="bca-progress"><i style={{width:"68%"}}/></div><div className="bca-progress-meta"><span>$0</span><span>$2,500 goal</span></div>
          </article>
          <article className="bca-card">
            <div className="bca-card-head"><div><span>TOP PRODUCT</span><h2>BCA Awareness Tee</h2></div><strong>96 sold</strong></div>
            <div className="bca-product-line"><div className="bca-product-art">BCA</div><div><b>$32 retail</b><small>$6.40 raised per shirt</small></div></div>
          </article>
        </section>
        <OrdersCard onViewAll={()=>setTab("Orders")}/>
      </>}

      {tab==="Sales"&&<>
        <section className="bca-stats">
          <div><span>Gross Sales</span><strong>$8,460</strong><small>Across all campaign products</small></div>
          <div><span>Eligible Sales</span><strong>$8,460</strong><small>Tracked for fundraising</small></div>
          <div><span>Net Raised</span><strong>$1,692</strong><small>After refunds</small></div>
          <div><span>Avg. Order</span><strong>$39.53</strong><small>214 orders</small></div>
        </section>
        <section className="bca-card"><div className="bca-card-head"><div><span>PERFORMANCE</span><h2>Sales by Product</h2></div></div><ProductTable/></section>
      </>}

      {tab==="Orders"&&<OrdersCard expanded/>}

      {tab==="Products"&&<section className="bca-card">
        <div className="bca-card-head"><div><span>CAMPAIGN PRODUCTS</span><h2>Products & Contributions</h2></div><button onClick={()=>setTab("Marketing")}>Promote Products</button></div>
        <ProductTable/>
      </section>}

      {tab==="Marketing"&&<section className="bca-marketing-grid">
        <article className="bca-card"><div className="bca-card-head"><div><span>READY TO SHARE</span><h2>Campaign Link</h2></div></div><p>Your department gets one clean campaign link to post on Facebook, email, text, QR codes and station materials.</p><div className="bca-copy-row"><code>fundraisingcommand.com/metro-bca</code><button onClick={()=>navigator.clipboard?.writeText("fundraisingcommand.com/metro-bca")}>Copy</button></div></article>
        <article className="bca-card"><div className="bca-card-head"><div><span>MARKETING KIT</span><h2>Department Assets</h2></div></div><div className="bca-asset-list"><div><strong>Social Post</strong><span>Square campaign graphic</span></div><div><strong>Story Graphic</strong><span>Vertical mobile graphic</span></div><div><strong>QR Flyer</strong><span>Printable station flyer</span></div><div><strong>Email Copy</strong><span>Ready-to-send announcement</span></div></div></article>
      </section>}

      {tab==="Payouts"&&<section className="bca-card">
        <div className="bca-card-head"><div><span>PAYOUTS</span><h2>Fundraising Payouts</h2></div><strong>$1,692 earned</strong></div>
        <div className="bca-payout-list"><div><div><strong>October Payout</strong><small>Current campaign earnings</small></div><span className="bca-pending">Pending · $1,692</span></div><div><div><strong>September Payout</strong><small>Previous campaign period</small></div><span className="bca-paid">Paid · $1,248</span></div></div>
      </section>}

      {tab==="Members"&&<section className="bca-card">
        <div className="bca-card-head"><div><span>DEPARTMENT ACCESS</span><h2>Members & Roles</h2></div><strong>4 users</strong></div>
        <div className="bca-member-list">{members.map(m=><div key={m[0]}><div><strong>{m[0]}</strong><small>{m[2]}</small></div><span>{m[1]}</span></div>)}</div>
        <p className="bca-help">Owners and Admins can manage department access. Managers can work campaigns and orders. Viewers can review reporting without changing anything.</p>
      </section>}

      <section className="bca-callout">
        <div><span>BUILT FOR FIRE · POLICE · EMS</span><h2>Your department runs the fundraiser. We handle the system behind it.</h2><p>Campaign storefront, products, Shopify checkout, live reporting, contribution tracking, member access and payout visibility — all in one department portal.</p></div>
        <Link href="/apply">Build This for My Department →</Link>
      </section>
    </main>
  </div>
}

function OrdersCard({onViewAll,expanded=false}:{onViewAll?:()=>void;expanded?:boolean}){
  const rows=expanded?[...orders,["#1044","Alex P.","BCA Hoodie","$52.00","Paid"],["#1043","Jordan K.","BCA Decal Pack","$12.00","Paid"]]:orders
  return <section className="bca-card">
    <div className="bca-card-head"><div><span>RECENT ACTIVITY</span><h2>Orders</h2></div>{onViewAll&&<button className="bca-text-button" onClick={onViewAll}>View all →</button>}</div>
    <div className="bca-table-wrap"><table className="bca-table"><thead><tr><th>Order</th><th>Customer</th><th>Product</th><th>Total</th><th>Status</th></tr></thead><tbody>{rows.map(o=><tr key={o[0]}>{o.map((v,i)=><td key={i}>{i===4?<span className="bca-paid">{v}</span>:v}</td>)}</tr>)}</tbody></table></div>
  </section>
}

function ProductTable(){
  return <div className="bca-table-wrap"><table className="bca-table"><thead><tr><th>Product</th><th>Sold</th><th>Retail</th><th>Fundraising</th></tr></thead><tbody>{products.map(p=><tr key={p[0]}>{p.map(v=><td key={v}>{v}</td>)}</tr>)}</tbody></table></div>
}