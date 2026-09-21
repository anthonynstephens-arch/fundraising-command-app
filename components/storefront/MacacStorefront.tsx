'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useDialogAccessibility } from '@/components/public/useDialogAccessibility'
import type { StoreProduct } from '@/lib/public/storefront'
import { type Campaign, useCampaignCart, CartDrawer, findVariant, campaignIsOpen, money } from './BaseStorefront'

const collection = [
  { key: 'polo', name: 'The signature polo', category: 'Apparel', color: 'Navy', description: 'A clean, professional staple. The navy polo pairs a classic silhouette with the MACAC mark at the chest.' },
  { key: 'quarter-zip', name: 'The everyday quarter-zip', category: 'Apparel', color: 'White', description: 'A fresh layer for the office, the conference, and everywhere in between. Finished with the MACAC mark in navy.' },
  { key: 'crewneck', name: 'The community crewneck', category: 'Apparel', color: 'Heather gray', description: 'An easygoing essential with a bold MACAC graphic. A little more comfort, with the same sense of community.' },
  { key: 'cap', name: 'The classic cap', category: 'Accessories', color: 'Navy', description: 'The finishing touch. A navy cap with the MACAC mark in crisp white.' },
  { key: 'bottle', name: 'The daily bottle', category: 'Drinkware', color: 'Navy', description: 'Bring MACAC along for the day. A navy insulated bottle with a carry handle and a clean white mark.' },
]
type Item = typeof collection[number] & { product?: StoreProduct }
const imageFor = (item: Item) => item.product?.images[0]?.url || `/brand/macac/${item.key}.webp`
const draft: Campaign = { id:'macac-preview', slug:'macac', name:'MACAC', description:null, status:'draft', starts_at:null, ends_at:null, storefront_eyebrow:null, storefront_supporting_text:null, storefront_header_message:null, goalAmount:0, organization_id:'', organization:{name:'MACAC',slug:'macac',logoUrl:null}, stats:{netRaised:0,progress:0},products:[],shopifyConnected:false }

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
    setMessage('Added to your bag.')
  }
  return <div className="macac-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div ref={ref} className="macac-detail" role="dialog" aria-modal="true" aria-labelledby="macac-product-title">
    <button className="macac-close" onClick={onClose} aria-label="Close product details">×</button>
    <div className="macac-detail-image"><Image src={variant?.image?.url||imageFor(item)} alt={item.name} fill sizes="(max-width: 700px) 100vw, 50vw" unoptimized /></div>
    <div className="macac-detail-copy"><p className="macac-label">MACAC / {item.category}</p><h2 id="macac-product-title">{product?.title||item.name}</h2><p>{product?.description||item.description}</p><p className="macac-color">{item.color}</p>
      {product && <strong className="macac-price">{variant?money(variant.price):`From ${money(product.minPrice)}`}</strong>}
      {canBuy ? <><div className="macac-options">{product!.options.map(option=><fieldset key={option.name}><legend>{option.name}</legend>{option.values.map(value=><button key={value} aria-pressed={selected[option.name]===value} onClick={()=>{setSelected({...selected,[option.name]:value});setMessage('')}}>{value}</button>)}</fieldset>)}</div><label className="macac-quantity">Quantity <input type="number" min="1" max="100" value={quantity} onChange={e=>setQuantity(Math.min(100,Math.max(1,Number(e.target.value)||1)))}/></label><button className="macac-cta" disabled={!variant?.available} onClick={add}>{!variant?'Choose your options':variant.available?'Add to bag':'Selection unavailable'}</button><p role="status">{message}</p></> : <div className="macac-availability"><strong>{product?'Ordering is currently unavailable':'Coming soon'}</strong><p>{product?'Please check back for ordering availability.':'Pricing and available options will be announced when the collection opens.'}</p></div>}
    </div></div></div>
}

export function MacacStorefront({ campaign }: { campaign?: Campaign | null }) {
  const active = campaign || draft
  const cart = useCampaignCart(active)
  const [cartOpen,setCartOpen] = useState(false)
  const [filter,setFilter] = useState('All pieces')
  const [selected,setSelected] = useState<Item|null>(null)
  const items: Item[] = campaign?.products.length ? campaign.products.map(product=>{
    const title=product.title.toLowerCase()
    const base=collection.find(i=>i.key==='quarter-zip'?/quarter|1\/4|zip/.test(title):i.key==='crewneck'?/crew|sweatshirt/.test(title):i.key==='cap'?/cap|hat/.test(title):i.key==='bottle'?/bottle|tumbler/.test(title):/polo/.test(title))
    return {...(base||{key:product.handle,name:product.title,category:'Apparel',color:'',description:product.description}),product}
  }) : collection
  const visible=items.filter(i=>filter==='All pieces'||i.category===filter)
  const bottle=items.find(i=>i.key==='bottle')
  return <div className="macac-store" id="macac-top">
    <a className="macac-skip" href="#macac-collection">Skip to collection</a>
    <div className="macac-announcement">MICHIGAN ASSOCIATION FOR COLLEGE ADMISSION COUNSELING</div>
    <header className="macac-header"><Link href="/stores/macac" className="macac-wordmark" aria-label="MACAC store home"><Image src="/brand/macac/logo-white.png" alt="MACAC — Michigan Association for College Admission Counseling" width={240} height={77} /><span>THE COLLECTION</span></Link><nav aria-label="Store navigation"><a href="#macac-collection">Collection</a><a href="#macac-story">Our community</a></nav><Link href="/stores/macac/login" className="macac-member-login">Member login</Link><button className="macac-bag" onClick={()=>setCartOpen(true)}>Bag <span>{cart.count.toString().padStart(2,'0')}</span></button></header>
    <main>
      <section className="macac-hero macac-bridge-hero" aria-labelledby="macac-title"><div className="macac-bridge-backdrop"><Image src="/brand/macac/mackinac-bridge.jpg" alt="Mackinac Bridge stretching across Michigan’s blue waters" fill priority sizes="100vw" /></div><div className="macac-hero-copy"><p className="macac-label">ROOTED IN MICHIGAN. CONNECTED BY PURPOSE.</p><h1 id="macac-title">Bridging the path<br/><em>to college.</em></h1><p className="macac-lead">For the professionals connecting Michigan’s students to their next chapter. Wear your MACAC community with pride.</p><a className="macac-cta macac-cta-light" href="#macac-collection">Explore the collection <span aria-hidden="true">↗</span></a><div className="macac-hero-note"><span>TWO PENINSULAS. ONE CONNECTED COMMUNITY.</span><span>The MACAC collection / Apparel & everyday essentials</span></div></div><div className="macac-bridge-caption"><span>THE MACKINAC BRIDGE</span><span>A Michigan connection.</span></div></section>
      <section className="macac-intro" id="macac-story"><p className="macac-label">THE MACAC COMMUNITY.</p><h2>Supporting students.<br/><span>Connecting professionals.</span></h2><p>Like the bridge that connects our peninsulas, MACAC brings people together. Celebrate the counselors and admission professionals helping students find their way from possibility to their next step.</p></section>
      <section className="macac-collection" id="macac-collection"><div className="macac-section-head"><div><p className="macac-label">THE MACAC EDIT</p><h2>Your everyday lineup.</h2></div><span>{items.length.toString().padStart(2,'0')} pieces / One community</span></div><div className="macac-filters" aria-label="Filter collection">{['All pieces','Apparel','Accessories','Drinkware'].map(name=><button key={name} aria-pressed={filter===name} onClick={()=>setFilter(name)}>{name}</button>)}</div>
      <div className="macac-grid">{visible.map((item,index)=><article className="macac-card" key={item.product?.id||item.key}><button className="macac-card-photo" onClick={()=>setSelected(item)} aria-label={`View ${item.product?.title||item.name}`}><Image src={imageFor(item)} alt={item.product?.title||item.name} fill sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw" unoptimized={!!item.product}/><span className="macac-card-index">{(index+1).toString().padStart(2,'0')}</span><span className="macac-card-action">Explore piece <span aria-hidden="true">↗</span></span></button><div className="macac-card-meta"><div><small>{item.category} / {item.color||'MACAC'}</small><button onClick={()=>setSelected(item)}>{item.product?.title||item.name}</button></div><span>{item.product?`${item.product.minPrice!==item.product.maxPrice?'From ':''}${money(item.product.minPrice)}`:'Coming soon'}</span></div></article>)}</div>
      </section>
      {bottle&&<section className="macac-feature"><div className="macac-feature-image"><Image src={imageFor(bottle)} alt="Navy MACAC insulated bottle" fill sizes="(max-width: 700px) 100vw, 50vw" unoptimized={!!bottle.product}/></div><div className="macac-feature-copy"><p className="macac-label">FOR THE DAYS THAT TAKE YOU PLACES.</p><h2>From campus visits<br/><em>to conference days.</em></h2><p>An everyday essential for campus visits, college fairs, and connecting with colleagues.</p><button className="macac-cta macac-cta-light" onClick={()=>setSelected(bottle)}>Discover the bottle <span aria-hidden="true">↗</span></button></div></section>}
    </main>
    <footer className="macac-footer"><div><a className="macac-wordmark" href="#macac-top"><Image src="/brand/macac/logo-white.png" alt="MACAC — Michigan Association for College Admission Counseling" width={240} height={77} /><span>THE COLLECTION</span></a><p>Michigan Association for<br/>College Admission Counseling</p></div><div><Link href="/stores/macac/login">Member login</Link><a href="#macac-collection">Explore the collection</a><a href="mailto:info@detroitdecalandapparel.com">Order support</a></div><div className="macac-footer-bottom"><span>Produced by Detroit Decal & Apparel</span><span>Powered by Fundraiser Command</span><span className="macac-photo-credit">Bridge photo: <a href="https://commons.wikimedia.org/wiki/File:Drone_at_Mackinac_bridge_-_Flickr_-_Nick_damico.jpg">Nick Damico</a> / <a href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</a> · displayed with crop & navy overlay</span><a href="#macac-top">Back to top ↑</a></div></footer>
    {selected&&<ProductDetails key={selected.product?.id||selected.key} item={selected} campaign={active} onClose={()=>setSelected(null)} onAdd={cart.add}/>}
    <CartDrawer campaign={active} cart={cart} open={cartOpen} onClose={()=>setCartOpen(false)}/>
  </div>
}
