'use client'

import {useState} from 'react'
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
    <div className="dmd-private-banner"><span>MEMBERS ONLY · PRIVATE COLLECTION</span><h1>DMD Private Store</h1><p>Order merchandise reserved for Detroit Metropolitan Dance. Your request date will be included with your Shopify order for review.</p></div>
    {!products.length?<div className="dmd-private-empty"><h2>Products are being prepared</h2><p>The private collection is ready. Products assigned to “Detroit Metropolitan Dance — Private Portal” in Shopify will appear here.</p></div>:<div className="dmd-private-grid">{products.map(p=><article key={p.id} className="dmd-private-product">
      <div className="dmd-private-image">{p.image?<img src={p.image} alt={p.title}/>:<span>DMD</span>}</div>
      <div className="dmd-private-product-info"><h2>{p.title}</h2>{p.description&&<p>{p.description}</p>}
        {p.variants.map(v=>{const id=numeric(v.id),quantity=cart[id]||0,available=v.inventoryPolicy==='CONTINUE'||v.inventoryQuantity===null||v.inventoryQuantity>quantity;return <div className="dmd-private-variant" key={id}><div><strong>{v.title==='Default Title'?'Standard':v.title}</strong><span>{money(v.price)}</span></div><div className="dmd-private-stepper"><button type="button" aria-label={`Remove ${v.title}`} disabled={!quantity} onClick={()=>setCart(old=>({...old,[id]:Math.max(0,(old[id]||0)-1)}))}>−</button><b>{quantity}</b><button type="button" aria-label={`Add ${v.title}`} disabled={!available||quantity>=100} onClick={()=>setCart(old=>({...old,[id]:(old[id]||0)+1}))}>+</button></div></div>})}
      </div>
    </article>)}</div>}
    {!!products.length&&<section className="dmd-private-checkout"><div><span>ORDER REQUEST</span><h2>{count} {count===1?'item':'items'} · {money(String(total))}</h2><label htmlFor="dmd-in-hands-by">In hands by <small>(optional)</small></label><input id="dmd-in-hands-by" type="date" min={new Date().toISOString().slice(0,10)} value={date} onChange={e=>setDate(e.target.value)}/><p>This is a requested date, subject to availability and production timing. Sign into your DMD Shopify business account during checkout to attach the order to the company account.</p></div><button disabled={!count||busy} onClick={checkout}>{busy?'Preparing checkout…':'Continue to Shopify checkout →'}</button>{error&&<p role="alert" className="dmd-private-error">{error}</p>}</section>}
  </div>
}
