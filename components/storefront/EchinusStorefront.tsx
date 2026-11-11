'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useDialogAccessibility } from '@/components/public/useDialogAccessibility'
import type { StoreProduct } from '@/lib/public/storefront'
import { type Campaign, useCampaignCart, CartDrawer, findVariant, campaignIsOpen, money } from './BaseStorefront'

const collection: {key:string;name:string;category:string;color:string;description:string}[] = []
type Item = typeof collection[number] & { product?: StoreProduct }
const imageFor = (item: Item) => item.product?.images[0]?.url || '/brand/echinus/logo.svg'
const draft: Campaign = { id:'echinus-preview', slug:'echinus', name:'Echinus', description:null, status:'draft', starts_at:null, ends_at:null, storefront_eyebrow:null, storefront_supporting_text:null, storefront_header_message:null, goalAmount:0, organization_id:'', organization:{name:'Echinus',slug:'echinus',logoUrl:null}, stats:{netRaised:0,progress:0},products:[],shopifyConnected:false }

function ProductDetails({ item, campaign, onClose, onAdd }: { item: Item; campaign: Campaign; onClose: () => void; onAdd: ReturnType<typeof useCampaignCart>['add'] }) {
  const ref = useDialogAccessibility<HTMLDivElement>(true, onClose)
  const product = item.product
  const [selected, setSelected] = useState<Record<string,string>>(() => Object.fromEntries((product?.options || []).filter(o=>o.values.length===1).map(o=>[o.name,o.values[0]])))
  const [quantity, setQuantity] = useState(1)
  const [message,setMessage] = useState('')
  const variant = product ? findVariant(product,selected) : null
  const canBuy = !!product && campaign.shopifyConnected && campaignIsOpen(campaign)
  function add() {
    if (!product || !variant?.available || !canBuy) return
    onAdd({ productId:product.id,variantId:variant.id,productTitle:product.title,variantTitle:variant.title,image:variant.image?.url||imageFor(item),quantity,price:variant.price,campaignId:campaign.id,organizationId:campaign.organization_id })
    setMessage('Added to your cart.')
  }
  return <div className="echinus-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div ref={ref} className="echinus-detail" role="dialog" aria-modal="true" aria-labelledby="echinus-product-title">
    <button className="echinus-close" onClick={onClose} aria-label="Close product details">×</button>
    <div className="echinus-detail-image"><Image src={variant?.image?.url||imageFor(item)} alt={item.name} fill sizes="(max-width: 700px) 100vw, 50vw" unoptimized /></div>
    <div className="echinus-detail-copy"><p className="echinus-label">Echinus / {item.category}</p><h2 id="echinus-product-title">{product?.title||item.name}</h2><p>{product?.description||item.description}</p><p className="echinus-color">{item.color}</p>
      {product && <strong className="echinus-price">{variant?money(variant.price):`From ${money(product.minPrice)}`}</strong>}
      {canBuy ? <><div className="echinus-options">{product!.options.map(option=><fieldset key={option.name}><legend>{option.name}</legend>{option.values.map(value=><button key={value} aria-pressed={selected[option.name]===value} onClick={()=>{setSelected({...selected,[option.name]:value});setMessage('')}}>{value}</button>)}</fieldset>)}</div><label className="echinus-quantity">Quantity <input type="number" min="1" max="100" value={quantity} onChange={e=>setQuantity(Math.min(100,Math.max(1,Number(e.target.value)||1)))}/></label><button className="echinus-cta" disabled={!variant?.available} onClick={add}>{!variant?'Choose your options':variant.available?'Add to cart':'Selection unavailable'}</button><p role="status">{message}</p></> : <div className="echinus-availability"><strong>{product?'Ordering is currently unavailable':'Coming soon'}</strong><p>{product?'Please check back for ordering availability.':'Pricing and available options will be announced when the collection opens.'}</p></div>}
    </div></div></div>
}

export function EchinusStorefront({ campaign }: { campaign?: Campaign | null }) {
  const active = campaign || draft
  const cart = useCampaignCart(active)
  const [cartOpen,setCartOpen] = useState(false)
  const [filter,setFilter] = useState('All pieces')
  const [selected,setSelected] = useState<Item|null>(null)
  const items: Item[] = campaign?.products.length ? campaign.products.map(product=>{
    const title=product.title.toLowerCase()
    const base=collection.find(i=>i.key==='quarter-zip'?/quarter|1\/4|zip/.test(title):i.key==='crewneck'?/crew|sweatshirt/.test(title):i.key==='cap'?/cap|hat/.test(title):i.key==='bottle'?/bottle|tumbler/.test(title):/polo/.test(title))
    return {...(base||{key:product.handle,name:product.title,category:/bottle|tumbler|mug|drinkware/.test(title)?'Drinkware':/cap|hat|bag|backpack/.test(title)?'Accessories':'Apparel',color:'',description:product.description}),product}
  }) : collection
  const visible=items.filter(i=>filter==='All pieces'||i.category===filter)
  const bottle=items.find(i=>i.key==='bottle')
  return <div className="echinus-store" id="echinus-top">
    <a className="echinus-skip" href="#echinus-collection">Skip to collection</a>
    <div className="echinus-announcement">ECHINUS DEVELOPMENT ADVISORS</div>
    <header className="echinus-header"><Link href="/stores/echinus" className="echinus-wordmark" aria-label="Echinus store home"><Image src="/brand/echinus/logo.svg" alt="Echinus — Echinus Development Advisors" width={300} height={60} /><span>THE COLLECTION</span></Link><nav aria-label="Store navigation"><a href="#echinus-collection">Collection</a><a href="#echinus-story">Our collection</a></nav><Link href="/departments/echinus/login" className="echinus-member-login">Team login</Link><button className="echinus-bag" onClick={()=>setCartOpen(true)}>Cart <span>{cart.count.toString().padStart(2,'0')}</span></button></header>
    <main>
      <section className="echinus-hero echinus-bridge-hero" aria-labelledby="echinus-title"><div className="echinus-bridge-backdrop" aria-hidden="true"><div className="echinus-columns"><i/><i/><i/><i/><i/></div></div><div className="echinus-hero-copy"><p className="echinus-label">CONSIDERED DESIGN. EVERYDAY PURPOSE.</p><h1 id="echinus-title">Built on vision.<br/><em>Worn with purpose.</em></h1><p className="echinus-lead">The Echinus Development Advisors collection. Professional apparel and everyday essentials for the people shaping what comes next.</p><a className="echinus-cta echinus-cta-light" href="#echinus-collection">Explore the collection <span aria-hidden="true">↗</span></a><div className="echinus-hero-note"><span>ECHINUS DEVELOPMENT ADVISORS</span><span>The Echinus collection / Apparel & everyday essentials</span></div></div><div className="echinus-bridge-caption"><span>THE ECHINUS COLLECTION</span><span>A considered approach.</span></div></section>
      <section className="echinus-intro" id="echinus-story"><p className="echinus-label">THE ECHINUS STANDARD.</p><h2>Professional presence.<br/><span>Everyday confidence.</span></h2><p>A focused collection designed to bring the Echinus identity into your working day. Clean details, versatile layers, and essentials that go wherever the day leads.</p></section>
      <section className="echinus-collection" id="echinus-collection"><div className="echinus-section-head"><div><p className="echinus-label">THE ECHINUS EDIT</p><h2>Your everyday lineup.</h2></div><span>{items.length.toString().padStart(2,'0')} pieces / One identity</span></div><div className="echinus-filters" aria-label="Filter collection">{['All pieces','Apparel','Accessories','Drinkware'].map(name=><button key={name} aria-pressed={filter===name} onClick={()=>setFilter(name)}>{name}</button>)}</div>
      {!items.length&&<div className="echinus-empty"><h3>The collection is taking shape.</h3><p>Echinus branded apparel and essentials will appear here as they become available.</p><a href="mailto:info@detroitdecalandapparel.com">Contact us about your collection ↗</a></div>}<div className="echinus-grid">{visible.map((item,index)=><article className="echinus-card" key={item.product?.id||item.key}><button className="echinus-card-photo" onClick={()=>setSelected(item)} aria-label={`View ${item.product?.title||item.name}`}><Image src={imageFor(item)} alt={item.product?.title||item.name} fill sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw" unoptimized={!!item.product}/><span className="echinus-card-index">{(index+1).toString().padStart(2,'0')}</span><span className="echinus-card-action">Explore piece <span aria-hidden="true">↗</span></span></button><div className="echinus-card-meta"><div><small>{item.category} / {item.color||'Echinus'}</small><button onClick={()=>setSelected(item)}>{item.product?.title||item.name}</button></div><span>{item.product?`${item.product.minPrice!==item.product.maxPrice?'From ':''}${money(item.product.minPrice)}`:'Coming soon'}</span></div></article>)}</div>
      </section>
      {bottle&&<section className="echinus-feature"><div className="echinus-feature-image"><Image src={imageFor(bottle)} alt="Echinus insulated bottle" fill sizes="(max-width: 700px) 100vw, 50vw" unoptimized={!!bottle.product}/></div><div className="echinus-feature-copy"><p className="echinus-label">FOR THE DAYS THAT TAKE YOU PLACES.</p><h2>From the office<br/><em>to the next opportunity.</em></h2><p>An everyday essential for meetings, project visits, and wherever your work takes you.</p><button className="echinus-cta echinus-cta-light" onClick={()=>setSelected(bottle)}>Discover the bottle <span aria-hidden="true">↗</span></button></div></section>}
    </main>
    <footer className="echinus-footer"><div><a className="echinus-wordmark" href="#echinus-top"><Image src="/brand/echinus/logo.svg" alt="Echinus — Echinus Development Advisors" width={300} height={60} /><span>THE COLLECTION</span></a><p>Echinus<br/>Development Advisors</p></div><div><Link href="/departments/echinus/login">Team login</Link><a href="#echinus-collection">Explore the collection</a><a href="mailto:info@detroitdecalandapparel.com">Order support</a></div><div className="echinus-footer-bottom"><span>Produced by Detroit Decal & Apparel</span><Link href="/apply">Start your own Fundraiser ↗</Link><a href="#echinus-top">Back to top ↑</a></div></footer>
    {selected&&<ProductDetails key={selected.product?.id||selected.key} item={selected} campaign={active} onClose={()=>setSelected(null)} onAdd={cart.add}/>}
    <CartDrawer campaign={active} cart={cart} open={cartOpen} onClose={()=>setCartOpen(false)}/>
  </div>
}
