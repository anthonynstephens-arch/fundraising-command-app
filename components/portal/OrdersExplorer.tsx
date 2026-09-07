"use client"
import { Fragment,useMemo,useState } from "react"

function money(v:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(v||0)}
function csvCell(v:any){return '"'+String(v??"").replaceAll('"','""')+'"'}
function download(name:string,body:string,type="text/csv"){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([body],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}

export default function OrdersExplorer({rows}:{rows:any[]}){
  const [search,setSearch]=useState("");const [payment,setPayment]=useState("all");const [fulfillment,setFulfillment]=useState("all")
  const filtered=useMemo(()=>rows.filter(r=>{
    const hay=(r.order+" "+r.customer+" "+r.email).toLowerCase()
    return (!search||hay.includes(search.toLowerCase()))&&(payment==="all"||r.payment===payment)&&(fulfillment==="all"||r.fulfillment===fulfillment)
  }),[rows,search,payment,fulfillment])
  const pending=filtered.filter(r=>r.fulfillment==="unfulfilled"||r.fulfillment==="partial")
  const delivered=filtered.filter(r=>r.fulfillment==="fulfilled")
  function exportCsv(){
    const head=["Order","Date","Customer","Items","Gross","Eligible","Refund","Fundraising","Payment","Fulfillment"]
    const body=[head,...filtered.map(r=>[r.order,r.date,r.customer,r.items,r.gross,r.eligible,r.refund,r.raised,r.payment,r.fulfillment])].map(x=>x.map(csvCell).join(",")).join("\n")
    download("campaign-orders.csv",body)
  }
  return <>
    <div className="agency-page-head"><div><h1>Orders</h1><p>Searchable, filterable order ledger for your campaign</p></div><button className="agency-outline-button" onClick={exportCsv}>↓ Export CSV</button></div>
    <section className="agency-card agency-filter-card"><header><div><h2>Filter Orders</h2></div></header><div className="agency-filter-row">
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order # or customer..."/>
      <select value={payment} onChange={e=>setPayment(e.target.value)}><option value="all">All payment</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="refunded">Refunded</option></select>
      <select value={fulfillment} onChange={e=>setFulfillment(e.target.value)}><option value="all">All fulfillment</option><option value="unfulfilled">Unfulfilled</option><option value="partial">Partial</option><option value="fulfilled">Fulfilled</option></select>
      <strong>{filtered.length} orders</strong>
    </div></section>
    <OrderBlock title="Pending Shipment" sub="Unfulfilled and partially fulfilled orders" rows={pending}/>
    <OrderBlock title="Delivered" sub="Fulfilled orders" rows={delivered}/>
    <OrderBlock title="All Orders" sub="Complete order ledger" rows={filtered}/>
  </>
}
function OrderBlock({title,sub,rows}:{title:string;sub:string;rows:any[]}){
  const [openOrder,setOpenOrder]=useState<string|null>(null)
  return <section className="agency-card"><header><div><h2>{title}</h2><p>{sub}</p></div><b>{rows.length} orders</b></header>{rows.length?<div className="agency-table-wrap"><table className="agency-table"><thead><tr><th>ORDER #</th><th>DATE</th><th>CUSTOMER</th><th>ITEMS</th><th>GROSS</th><th>ELIGIBLE</th><th>REFUND</th><th>FUNDRAISING</th><th>PAYMENT</th><th>FULFILLMENT</th></tr></thead><tbody>{rows.map(r=>{
    const open=openOrder===r.id
    return <Fragment key={r.id}>
      <tr className={"agency-order-row "+(open?"open":"")} onClick={()=>setOpenOrder(open?null:r.id)} aria-expanded={open}>
        <td><button type="button" className="agency-order-link" onClick={event=>{event.stopPropagation();setOpenOrder(open?null:r.id)}}>{r.order}<span>{open?"−":"+"}</span></button></td>
        <td>{r.date}</td><td><b className="agency-customer-name">{r.customer}</b></td><td>{r.items}</td><td>{money(r.gross)}</td><td>{money(r.eligible)}</td><td className="red">{money(r.refund)}</td><td className="green"><b>{money(r.raised)}</b></td><td><span className="agency-pill active">{r.payment}</span></td><td><span className="agency-pill">{r.fulfillment}</span></td>
      </tr>
      {open&&<tr className="agency-order-detail-row"><td colSpan={10}>
        <div className="agency-order-detail">
          <div className="agency-order-detail-head"><div><small>ORDER DETAILS</small><h3>{r.order} · {r.customer}</h3></div><div><span>{r.items} items</span><strong>{money(r.gross)}</strong></div></div>
          <div className="agency-line-items">
            <div className="agency-line-head"><span>ITEM</span><span>SKU</span><span>QTY</span><span>UNIT</span><span>TOTAL</span><span>RAISED</span></div>
            {(r.lines||[]).map((line:any)=><div className="agency-line-item" key={line.id}>
              <span><strong>{line.title}</strong>{line.variant&&<small>{line.variant}</small>}</span>
              <span>{line.sku||"—"}</span><span>{line.quantity}</span><span>{money(line.unitPrice)}</span><span><b>{money(line.total)}</b></span><span className="green"><b>{money(line.contribution)}</b></span>
            </div>)}
          </div>
          {r.email&&<div className="agency-order-contact"><span>Customer email</span><b>{r.email}</b></div>}
        </div>
      </td></tr>}
    </Fragment>
  })}</tbody></table></div>:<div className="agency-empty">No orders in this view.</div>}</section>
}
