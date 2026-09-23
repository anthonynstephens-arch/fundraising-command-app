import Link from 'next/link'
import type {DmdOrder} from '@/lib/shopify/dmd-private'

const money=(order:DmdOrder)=>new Intl.NumberFormat('en-US',{style:'currency',currency:order.currency||'USD'}).format(Number(order.total))
const label=(value:string)=>value.replace(/_/g,' ').toLowerCase().replace(/^./,letter=>letter.toUpperCase())

export default function DmdOrdersOverview({orders,error}:{orders:DmdOrder[];error?:boolean}){
  return <section className="agency-card dmd-orders-overview">
    <header><div><h2>DMD Shopify Orders</h2><p>Available orders under the DMD business account, plus orders placed through the private portal</p></div><Link href="/stores/dmd/private">Shop private collection →</Link></header>
    {error&&<p role="alert" className="agency-empty">Shopify company orders are temporarily unavailable. Check the integration’s company and order read access.</p>}
    {!orders.length&&!error?<p className="agency-empty">No DMD orders found yet.</p>:!!orders.length&&<div className="agency-table-wrap"><table className="agency-table"><thead><tr><th>ORDER</th><th>PLACED</th><th>TOTAL</th><th>IN HANDS BY</th><th>PAYMENT</th><th>FULFILLMENT & TRACKING</th></tr></thead><tbody>{orders.map(order=><tr key={order.id}>
      <td><b>{order.name}</b></td><td>{new Date(order.createdAt).toLocaleDateString('en-US',{timeZone:'America/Detroit'})}</td><td>{money(order)}</td><td>{order.inHandsBy?new Date(order.inHandsBy+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC'}):'—'}</td><td>{label(order.financialStatus)}</td>
      <td><span className={'agency-pill '+(order.fulfillmentStatus==='FULFILLED'?'active':'')}>{label(order.fulfillmentStatus)}</span>{order.tracking.filter(t=>t.number||t.url).map((t,i)=><div key={i} className="dmd-order-tracking">{t.url?.startsWith('https://')?<a href={t.url} target="_blank" rel="noopener noreferrer">Track {t.company||'shipment'} {t.number||'↗'}</a>:<span>{t.company||'Tracking'} {t.number}</span>}</div>)}</td>
    </tr>)}</tbody></table></div>}
    <p className="dmd-order-footnote">Orders older than Shopify&apos;s current API access window require historical-order permission to import.</p>
  </section>
}
