'use client'
import { useState } from 'react'
import type { StoreProduct } from '@/lib/public/storefront'
import { type Campaign, useCampaignCart, CartDrawer, findVariant, campaignIsOpen, money } from '@/components/storefront/BaseStorefront'
import { FloatingProductImage } from '@/components/storefront/FloatingProductImage'
import { useDialogAccessibility } from '@/components/public/useDialogAccessibility'

function Detail({product,campaign,onClose,onAdd,club}:{product:StoreProduct;campaign:Campaign;onClose:()=>void;onAdd:ReturnType<typeof useCampaignCart>['add'];club:'volleyball'|'flag-football'}) {
  const ref=useDialogAccessibility<HTMLDivElement>(true,onClose)
  const [selected,setSelected]=useState<Record<string,string>>(()=>Object.fromEntries(product.options.filter(o=>o.values.length===1).map(o=>[o.name,o.values[0]])))
  const [quantity,setQuantity]=useState(1)
  const [message,setMessage]=useState('')
  const variant=findVariant(product,selected)
  const canBuy=campaign.shopifyConnected&&campaignIsOpen(campaign)
  function add(){if(!variant?.available||!canBuy)return;onAdd({productId:product.id,variantId:variant.id,productTitle:product.title,variantTitle:variant.title,image:variant.image?.url||product.images[0]?.url||'',quantity,price:variant.price,campaignId:campaign.id,organizationId:campaign.organization_id});setMessage('Added to your cart.')}
  return <div className="mk-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="mk-detail" ref={ref} role="dialog" aria-modal="true" aria-labelledby="mk-product-title"><button className="mk-close" onClick={onClose} aria-label="Close">×</button><div className="mk-detail-art"><FloatingProductImage image={variant?.image||product.images[0]} title={product.title}/></div><div className="mk-detail-copy"><p className="mk-label">MANAKOA {club==='volleyball'?'VOLLEYBALL':'FLAG FOOTBALL'}</p><h2 id="mk-product-title">{product.title}</h2><strong>{variant?money(variant.price):`From ${money(product.minPrice)}`}</strong><p>{product.description}</p>{canBuy?<><div className="mk-options">{product.options.map(o=><fieldset key={o.name}><legend>{o.name}</legend>{o.values.map(v=><button key={v} aria-pressed={selected[o.name]===v} onClick={()=>{setSelected({...selected,[o.name]:v});setMessage('')}}>{v}</button>)}</fieldset>)}</div><label>Quantity <input type="number" min="1" max="100" value={quantity} onChange={e=>setQuantity(Math.min(100,Math.max(1,Number(e.target.value)||1)))}/></label><button className="mk-button mk-add" disabled={!variant?.available} onClick={add}>{!variant?'CHOOSE YOUR OPTIONS':variant.available?'ADD TO CART':'UNAVAILABLE'}</button><p role="status">{message}</p></>:<p>Ordering is currently unavailable.</p>}</div></div></div>
}
export default function Volleyball({campaign,club='volleyball'}:{campaign:Campaign;club?:'volleyball'|'flag-football'}){
 const cart=useCampaignCart(campaign);const [open,setOpen]=useState(false);const [selected,setSelected]=useState<StoreProduct|null>(null)
 return <section className="mk-products" id="volleyball"><div className="mk-products-head"><div><p className="mk-label">THE {club==='volleyball'?'VOLLEYBALL':'FLAG FOOTBALL'} COLLECTION</p><h2>THE SHARK<br/><em>TANK.</em></h2><p>Gear for the {club==='volleyball'?'court':'field'}, the stands, and everywhere in between.</p></div><button className="mk-cart" onClick={()=>setOpen(true)}>CART ({cart.count}) ↗</button></div><div className="mk-product-grid">{campaign.products.map(p=><article key={p.id}><button className="mk-product-art" onClick={()=>setSelected(p)} aria-label={`View ${p.title}`}><FloatingProductImage image={p.images[0]} title={p.title}/><span>VIEW DETAILS ↗</span></button><div className="mk-product-meta">{p.vendor && <span className="mk-product-brand">{p.vendor}</span>}<button onClick={()=>setSelected(p)}>{p.title}</button><strong>{p.minPrice!==p.maxPrice?'From ':''}{money(p.minPrice)}</strong></div></article>)}</div>{selected&&<Detail key={selected.id} product={selected} campaign={campaign} club={club} onClose={()=>setSelected(null)} onAdd={cart.add}/>}<CartDrawer campaign={campaign} cart={cart} open={open} onClose={()=>setOpen(false)}/></section>
}
