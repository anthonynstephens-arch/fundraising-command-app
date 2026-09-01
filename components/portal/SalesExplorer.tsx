"use client"
import { useMemo,useState } from "react"
import PortalMetricChart from "@/components/portal/PortalMetricChart"

function money(v:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(v||0)}

export default function SalesExplorer({orders,items,products}:{orders:any[];items:any[];products:any[]}){
  const [days,setDays]=useState(60);const [product,setProduct]=useState("all");const [payment,setPayment]=useState("all")
  const cutoff=Date.now()-days*86400000
  const filteredOrders=useMemo(()=>orders.filter(o=>(!o.placed_at||new Date(o.placed_at).getTime()>=cutoff)&&(payment==="all"||o.status===payment)),[orders,days,payment,cutoff])
  const orderIds=new Set(filteredOrders.map(o=>o.id))
  const filteredItems=useMemo(()=>items.filter(i=>orderIds.has(i.order_id)&&(product==="all"||String(i.shopify_product_id)===product)),[items,product,filteredOrders.length])
  const gross=filteredItems.reduce((a,i)=>a+Number(i.unit_price||0)*Number(i.quantity||0),0)
  const refund=filteredItems.reduce((a,i)=>a+Number(i.refunded_merchandise_amount||0),0)
  const eligible=Math.max(0,gross-refund)
  const raised=filteredItems.reduce((a,i)=>a+Number(i.contribution_amount||0)-Number(i.refunded_contribution_amount||0),0)
  const avg=filteredOrders.length?gross/filteredOrders.length:0
  const byDate=new Map<string,{date:string,sales:number,orders:number,items:number,fundraising:number}>()
  for(const o of filteredOrders){if(!o.placed_at)continue;const k=new Date(o.placed_at).toISOString().slice(0,10);if(!byDate.has(k))byDate.set(k,{date:k,sales:0,orders:0,items:0,fundraising:0});byDate.get(k)!.orders++}
  for(const i of filteredItems){const o=filteredOrders.find(o=>o.id===i.order_id);if(!o?.placed_at)continue;const k=new Date(o.placed_at).toISOString().slice(0,10);const r=byDate.get(k)||{date:k,sales:0,orders:0,items:0,fundraising:0};r.sales+=Number(i.unit_price||0)*Number(i.quantity||0)-Number(i.refunded_merchandise_amount||0);r.items+=Number(i.quantity||0);r.fundraising+=Number(i.contribution_amount||0)-Number(i.refunded_contribution_amount||0);byDate.set(k,r)}
  const series=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date))
  return <>
    <div className="agency-page-head"><div><h1>Sales Analytics</h1><p>Detailed breakdown of campaign sales performance</p></div></div>
    <section className="agency-card agency-filter-card"><header><div><h2>Filters</h2><p>Refine the live Shopify-backed data shown below</p></div></header><div className="agency-filter-row">
      <div><label>Date range</label><div className="agency-tabs">{[7,30,60,90].map(n=><button key={n} onClick={()=>setDays(n)} className={days===n?"active":""}>{n} days</button>)}</div></div>
      <label>Product<select value={product} onChange={e=>setProduct(e.target.value)}><option value="all">All products</option>{products.map((p:any)=><option key={p.id} value={p.shopify_product_id}>{p.title}</option>)}</select></label>
      <label>Payment status<select value={payment} onChange={e=>setPayment(e.target.value)}><option value="all">All statuses</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="refunded">Refunded</option></select></label>
      <strong>{filteredOrders.length} orders · {money(gross)} gross</strong>
    </div></section>
    <section className="agency-kpis four"><div><span>GROSS SALES</span><strong>{money(gross)}</strong></div><div><span>NET ELIGIBLE</span><strong>{money(eligible)}</strong></div><div><span>FUNDRAISING</span><strong className="orange">{money(raised)}</strong></div><div><span>AVG. ORDER VALUE</span><strong>{money(avg)}</strong></div></section>
    <PortalMetricChart data={series} title="Sales by Day" subtitle={"Last "+days+" days · live campaign orders"}/>
  </>
}