'use client'

import {useState} from 'react'
import {FloatingProductImage} from '@/components/storefront/FloatingProductImage'
import type {PrivateProduct} from '@/lib/shopify/dmd-private'

const money=(amount:string)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(amount))
const numeric=(id:string)=>id.split('/').pop()||id

export default function DmdPrivateStore({products}:{products:PrivateProduct[]}){
  const [cart,setCart]=useState<Record<string,number>>({})
  const [date,setDate]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const variants=products.flatMap(p=>p.variants)
  const count=Object.values(cart).reduce((sum,n)=>sum+n,0)
  const total=variants.reduce((sum,v)=>sum+Number(v.price)*(cart[numeric(v.id)]||0),0)
  async function checkout(){
    setBusy(true);setError('')
    try{
      const response=await fetch('/api/dmd/private-checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:Object.entries(cart).filter(([,q])=>q>0).map(([variantId,quantity])=>({variantId,quantity})),inHandsBy:date})})
      const result=await response.json()
      if(!response.ok||!result.checkoutUrl)throw new Error(result.error||'Could not start checkout.')
      window.location.assign(result.checkoutUrl)
    }catch(e){setError(e instanceof Error?e.message:'Could not start checkout.');setBusy(false)}
  }
  return <div className="dmd-private-store">
    <div className="dmd-private-banner"><span>MEMBERS ONLY · PRIVATE COLLECTION</span><h1>DMD Private Store</h1><p>Shop the DMD collection at Detroit Decal base prices, exclusively for signed-in DMD members. No fundraising markup is added.</p></div>
    {!products.length?<div className="dmd-private-empty"><h2>Products are being prepared</h2><p>Please check back for DMD merchandise.</p></div>:<div className="dmd-private-grid">{products.map(p=><article key={p.id} className="dmd-private-product">
      <div className="dmd-private-image"><FloatingProductImage image={p.image?{url:p.image,altText:p.title,width:null,height:null}:undefined} title={p.title}/></div>
      <div className="dmd-private-product-info"><h2>{p.title}</h2>
        {!!p.variants.length&&<div className="dmd-private-price">{new Set(p.variants.map(v=>v.price)).size>1?'From ':''}{money(String(Math.min(...p.variants.map(v=>Number(v.price)))))}</div>}
        <details className="dmd-private-sizes"><summary>Choose sizes <span aria-hidden="true">+</span></summary>
        {p.variants.map(v=>{const id=numeric(v.id),quantity=cart[id]||0,available=v.inventoryPolicy==='CONTINUE'||v.inventoryQuantity===null||v.inventoryQuantity>quantity;return <div className="dmd-private-variant" key={id}><div><strong>{v.title==='Default Title'?'Standard':v.title}</strong><span>{money(v.price)}</span></div><div className="dmd-private-stepper"><button type="button" aria-label={`Remove ${v.title}`} disabled={!quantity} onClick={()=>setCart(old=>({...old,[id]:Math.max(0,(old[id]||0)-1)}))}>−</button><b>{quantity}</b><button type="button" aria-label={`Add ${v.title}`} disabled={!available||quantity>=100} onClick={()=>setCart(old=>({...old,[id]:(old[id]||0)+1}))}>+</button></div></div>})}
        </details>
      </div>
    </article>)}</div>}
    {!!products.length&&<section className="dmd-private-checkout"><div><span>ORDER REQUEST</span><h2>{count} {count===1?'item':'items'} · {money(String(total))}</h2><label htmlFor="dmd-in-hands-by">In hands by <small>(optional)</small></label><input id="dmd-in-hands-by" type="date" min={new Date().toISOString().slice(0,10)} value={date} onChange={e=>setDate(e.target.value)}/><p>This is a requested date, subject to availability and production timing. Taxes and shipping are calculated at checkout. Your requested date will be included with your order.</p></div><button disabled={!count||busy} onClick={checkout}>{busy?'Preparing checkout…':'Continue to Shopify checkout →'}</button>{error&&<p role="alert" className="dmd-private-error">{error}</p>}</section>}
  </div>
}
