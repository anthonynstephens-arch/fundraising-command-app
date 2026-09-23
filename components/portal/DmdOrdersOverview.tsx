'use client'

import {Fragment,useState} from 'react'
import Link from 'next/link'
import type {DmdOrder} from '@/lib/shopify/dmd-private'

const money=(amount:string|number,currency='USD')=>new Intl.NumberFormat('en-US',{style:'currency',currency}).format(Number(amount||0))
const label=(value:string)=>String(value||'Unknown').replace(/_/g,' ').toLowerCase().replace(/^./,letter=>letter.toUpperCase())
function shopifyUrl(raw?:string|null){
  if(!raw)return null
  try{const url=new URL(raw);return url.protocol==='https:'&&['detroitdecalandapparel.com','www.detroitdecalandapparel.com'].includes(url.hostname)?url.href:null}catch{return null}
}

export default function DmdOrdersOverview({orders,error}:{orders:DmdOrder[];error?:boolean}){
  const [expanded,setExpanded]=useState<string|null>(null)
  return <section className="agency-card dmd-orders-overview">
    <header><div><h2>DMD Shopify Orders</h2><p>Available orders under the DMD business account, plus orders placed through the private portal</p></div><Link href="/stores/dmd/private">Shop private collection →</Link></header>
    {error&&<p role="alert" className="agency-empty">DMD orders are temporarily unavailable. Please refresh or contact support.</p>}
    {!orders.length&&!error?<p className="agency-empty">No DMD orders found yet.</p>:!!orders.length&&<div className="agency-table-wrap"><table className="agency-table"><thead><tr><th>ORDER</th><th>PLACED</th><th>TOTAL</th><th>IN HANDS BY</th><th>PAYMENT</th><th>FULFILLMENT & TRACKING</th></tr></thead><tbody>{orders.map(order=>{
      const open=expanded===order.id
      const outstanding=Number(order.outstanding||0)
      const paymentUrl=shopifyUrl(order.paymentUrl)||shopifyUrl(order.statusUrl)
      const statusUrl=shopifyUrl(order.statusUrl)
      return <Fragment key={order.id}><tr className="dmd-order-row" onClick={event=>{if(!(event.target as HTMLElement).closest('a,button'))setExpanded(open?null:order.id)}}>
        <td><button type="button" className="dmd-order-toggle" aria-expanded={open} aria-controls={'dmd-order-detail-'+order.id} onClick={()=>setExpanded(open?null:order.id)}><span aria-hidden="true">{open?'▾':'▸'}</span><b>{order.name}</b></button></td>
        <td>{new Date(order.createdAt).toLocaleDateString('en-US',{timeZone:'America/Detroit'})}</td>
        <td>{money(order.total,order.currency)}</td>
        <td>{order.inHandsBy?new Date(order.inHandsBy+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC'}):'—'}</td>
        <td><span className={outstanding>0?'dmd-payment-due':''}>{label(order.financialStatus)}</span></td>
        <td><span className={'agency-pill '+(order.fulfillmentStatus==='FULFILLED'?'active':'')}>{label(order.fulfillmentStatus)}</span>{order.tracking.filter(t=>t.number||t.url).map((t,i)=><div key={i} className="dmd-order-tracking">{t.url?.startsWith('https://')?<a href={t.url} target="_blank" rel="noopener noreferrer">Track {t.company||'shipment'} {t.number||'↗'}</a>:<span>{t.company||'Tracking'} {t.number}</span>}</div>)}</td>
      </tr>{open&&<tr id={'dmd-order-detail-'+order.id} className="dmd-order-detail-row"><td colSpan={6}><div className="dmd-order-expanded">
        <div className="dmd-order-items"><h3>Order details</h3>{order.items?.length?<ul>{order.items.map((item,i)=><li key={i}><div><strong>{item.title}</strong>{item.variant&&<small>{item.variant}</small>}</div><span>{item.quantity} × {money(item.unitPrice,order.currency)}</span><b>{money(item.quantity*Number(item.unitPrice),order.currency)}</b></li>)}</ul>:<p>Line items are not available for this order.</p>}</div>
        <div className="dmd-order-payment"><h3>Payment &amp; fulfillment</h3><dl><div><dt>Order total</dt><dd>{money(order.total,order.currency)}</dd></div><div><dt>Payment status</dt><dd>{label(order.financialStatus)}</dd></div>{order.paymentTerms&&<div><dt>Payment terms</dt><dd>{order.paymentTerms}</dd></div>}<div><dt>Balance due</dt><dd className={outstanding>0?'dmd-payment-due':''}>{money(outstanding,order.currency)}</dd></div><div><dt>Fulfillment</dt><dd>{label(order.fulfillmentStatus)}</dd></div>{order.inHandsBy&&<div><dt>In hands by</dt><dd>{order.inHandsBy}</dd></div>}</dl>
          {outstanding>0&&order.fulfillmentStatus!=='CANCELLED'&&(paymentUrl?<a className="dmd-pay-button" href={paymentUrl} target="_blank" rel="noopener noreferrer">Pay {money(outstanding,order.currency)} in Shopify ↗</a>:<p>Sign in to your DMD Shopify business account to pay this order.</p>)}
          {outstanding<=0&&statusUrl&&<a className="dmd-order-status-link" href={statusUrl} target="_blank" rel="noopener noreferrer">View order in Shopify ↗</a>}
          {outstanding>0&&<small>Shopify handles payment securely. The balance shown here updates when Shopify sends an order update.</small>}
        </div>
      </div></td></tr>}</Fragment>
    })}</tbody></table></div>}
    <p className="dmd-order-footnote">Orders older than Shopify&apos;s current API access window require historical-order permission to import.</p>
  </section>
}
