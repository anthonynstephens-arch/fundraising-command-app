"use client"

import Link from "next/link"
import { LegalNotice } from "@/components/legal/LegalLinks"
import {isDmdOrganization,DMD_LOGO,DMD_LOGIN} from "@/lib/branding/dmd"
import {useEffect,useMemo,useRef,useState} from "react"
import {useDialogAccessibility} from "@/components/public/useDialogAccessibility"
import type {StoreImage,StoreProduct,StoreVariant} from "@/lib/public/storefront"

export type Campaign={id:string;slug:string;name:string;description:string|null;status:string;starts_at:string|null;ends_at:string|null;storefront_eyebrow:string|null;storefront_supporting_text:string|null;storefront_header_message:string|null;goalAmount:number;organization_id:string;organization:{name:string;slug?:string;logoUrl:string|null};stats:{netRaised:number;progress:number};products:StoreProduct[];shopifyConnected:boolean}
export type CartItem={productId:string;variantId:string;productTitle:string;variantTitle:string;image:string|null;quantity:number;price:number;campaignId:string;organizationId:string}

export const money=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value)

export function emitStoreEvent(name:string,detail:Record<string,unknown>){
  if(typeof window==="undefined")return
  window.dispatchEvent(new CustomEvent("fundraiser-storefront",{detail:{name,...detail}}))
  const dataLayer=(window as Window&{dataLayer?:Record<string,unknown>[]}).dataLayer
  dataLayer?.push({event:name,...detail})
}

export function useCampaignCart(campaign:Campaign){
  const key=`fundraiser-command-cart:${campaign.id}`
  const [items,setItems]=useState<CartItem[]>([])
  const [ready,setReady]=useState(false)
  useEffect(()=>{
    try{const saved=localStorage.getItem(key);if(saved){const parsed=JSON.parse(saved);if(Array.isArray(parsed))setItems(parsed.filter(item=>item&&item.campaignId===campaign.id&&item.organizationId===campaign.organization_id&&typeof item.variantId==="string"&&Number.isInteger(item.quantity)&&item.quantity>0&&item.quantity<=100&&Number.isFinite(item.price)&&item.price>=0))}}catch{}
    setReady(true)
  },[key])
  useEffect(()=>{if(ready){try{localStorage.setItem(key,JSON.stringify(items))}catch{}}},[items,key,ready])
  const add=(item:CartItem)=>setItems(current=>{
    const found=current.find(existing=>existing.variantId===item.variantId)
    return found?current.map(existing=>existing.variantId===item.variantId?{...existing,quantity:Math.min(100,existing.quantity+item.quantity)}:existing):[...current,item]
  })
  const update=(variantId:string,quantity:number)=>setItems(current=>quantity<1?current.filter(item=>item.variantId!==variantId):current.map(item=>item.variantId===variantId?{...item,quantity:Math.min(100,quantity)}:item))
  return {items,add,update,replacePrices:(prices:Array<{variantId:string;price:number}>)=>setItems(current=>current.map(item=>{const fresh=prices.find(p=>p.variantId===item.variantId);return fresh?{...item,price:fresh.price}:item})),clear:()=>setItems([]),count:items.reduce((sum,item)=>sum+item.quantity,0),subtotal:items.reduce((sum,item)=>sum+item.price*item.quantity,0)}
}

function StoreHeader({campaign,count,onCart}:{campaign:Campaign;count:number;onCart:()=>void}){
  const dmd=isDmdOrganization(campaign.organization)
  const supporting=campaign.storefront_supporting_text||`Supporting ${campaign.organization.name}`
  return <header className="store-header"><div className="store-header-inner"><Link href={`/fundraisers/${campaign.slug}`} className="store-identity">
    {(dmd||campaign.organization.logoUrl)?<img src={dmd?DMD_LOGO:campaign.organization.logoUrl!} alt={`${campaign.organization.name} logo`}/>:<span>{campaign.organization.name.slice(0,2).toUpperCase()}</span>}
    <div><strong>{campaign.name}</strong><small>{supporting}</small></div>
  </Link><div className="store-header-actions">{dmd&&<Link className="dmd-member-link" href={DMD_LOGIN}>Member login</Link>}<button className="store-cart-button" onClick={onCart} aria-label={`Open cart with ${count} items`}><span aria-hidden="true">Cart</span><b>{count}</b></button></div></div>{campaign.storefront_header_message&&<div className="store-header-message">{campaign.storefront_header_message}</div>}</header>
}

function StoreFooter({campaign}:{campaign:Campaign}){
  return <footer className="store-footer"><div><b>{isDmdOrganization(campaign.organization)?"Detroit Metropolitan Dance":"Fundraiser Command"}</b><span>Fulfilled by Detroit Decal &amp; Apparel</span></div><Link className="store-fundraiser-link" href="/apply">Start your own Fundraiser <span aria-hidden="true">↗</span></Link></footer>
}

export function CartDrawer({campaign,cart,open,onClose}:{campaign:Campaign;cart:ReturnType<typeof useCampaignCart>;open:boolean;onClose:()=>void}){
  const [checkingOut,setCheckingOut]=useState(false)
  const [error,setError]=useState("")
  const dialogRef=useDialogAccessibility<HTMLElement>(open,onClose)
  async function checkout(){
    if(!cart.items.length)return
    setCheckingOut(true);setError("")
    emitStoreEvent("checkout_started",{campaignId:campaign.id,itemCount:cart.count,value:cart.subtotal})
    try{
      const response=await fetch("/api/storefront/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({campaignSlug:campaign.slug,items:cart.items.map(item=>({variantId:item.variantId,quantity:item.quantity,price:item.price}))})})
      const data=await response.json()
      if(data.pricesChanged&&Array.isArray(data.items)){
        cart.replacePrices(data.items)
        setError("Prices have changed. Review the updated subtotal, then select checkout again.")
        setCheckingOut(false)
        return
      }
      if(!response.ok||!data.checkoutUrl)throw new Error(data.error||"Checkout could not be started.")
      window.location.assign(data.checkoutUrl)
    }catch(error){setError(error instanceof Error?error.message:"Checkout could not be started.");setCheckingOut(false)}
  }
  if(!open)return null
  return <div className="store-drawer-layer" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><aside ref={dialogRef} className="store-cart" role="dialog" aria-modal="true" aria-label="Shopping cart">
    <div className="store-cart-head"><div><small>YOUR CART</small><h2>{cart.count?`${cart.count} item${cart.count===1?"":"s"}`:"Your cart is empty"}</h2></div><button onClick={onClose} aria-label="Close cart">×</button></div>
    <div className="store-cart-lines">{cart.items.map(item=><article className="store-cart-line" key={item.variantId}>{item.image?<img src={item.image} alt=""/>:<div className="store-cart-placeholder"/>}<div className="store-cart-copy"><strong>{item.productTitle}</strong><span>{item.variantTitle}</span><b>{money(item.price)}</b><div className="store-quantity"><button onClick={()=>cart.update(item.variantId,item.quantity-1)} aria-label={`Decrease ${item.productTitle} quantity`}>−</button><span>{item.quantity}</span><button disabled={item.quantity>=100} onClick={()=>cart.update(item.variantId,item.quantity+1)} aria-label={`Increase ${item.productTitle} quantity`}>+</button></div><button className="store-remove" onClick={()=>cart.update(item.variantId,0)}>Remove</button></div><strong>{money(item.price*item.quantity)}</strong></article>)}</div>
    {!cart.items.length&&<div className="store-cart-empty"><span>🛍️</span><p>Add fundraiser gear and it will stay here while you keep shopping.</p><button onClick={onClose}>Continue shopping</button></div>}
    {!!cart.items.length&&<div className="store-cart-footer"><div><span>Subtotal</span><strong>{money(cart.subtotal)}</strong></div><p>Shipping, taxes, and payment are handled securely by Shopify.</p>{error&&<div className="store-error" role="alert">{error}</div>}<LegalNotice action="placing an order"/><button className="store-checkout" disabled={checkingOut} onClick={checkout}>{checkingOut?"Preparing secure checkout…":"Checkout with Shopify"}</button><button className="store-continue" onClick={onClose}>Continue shopping</button></div>}
  </aside></div>
}

function ProductImage({image,title}:{image:StoreImage|undefined;title:string}){
  return image?<img src={image.url} alt={image.altText||title} loading="lazy"/>:<div className="store-image-empty">Image coming soon</div>
}

function ProductCard({campaign,product}:{campaign:Campaign;product:StoreProduct}){
  return <Link className="store-product-card" href={`/fundraisers/${campaign.slug}/products/${product.handle}`} onClick={()=>emitStoreEvent("product_view",{campaignId:campaign.id,productId:product.id})}>
    <div className="store-product-photo"><ProductImage image={product.images[0]} title={product.title}/>{!product.available&&<span className="store-sold-out">Sold out</span>}</div>
    <div className="store-product-summary"><h2>{product.title}</h2><p>{product.minPrice===product.maxPrice?money(product.minPrice):`From ${money(product.minPrice)}`}</p>{product.options.length>0&&<small>Choose your options <span aria-hidden="true">→</span></small>}</div>
  </Link>
}

function CampaignIntro({campaign}:{campaign:Campaign}){
  if(isDmdOrganization(campaign.organization)) return <section className="dmd-store-intro"><div><small>{campaign.storefront_eyebrow||"THE OFFICIAL DMD STORE"}</small><h1>Made for<br/><em>movement.</em></h1><p>{campaign.description||"Apparel for the Detroit Metropolitan Dance community."}</p></div><img src={DMD_LOGO} alt="Detroit Metropolitan Dance"/></section>

  const end=campaign.ends_at?new Date(campaign.ends_at):null
  const eyebrow=campaign.storefront_eyebrow||"OFFICIAL FUNDRAISER STORE"
  const supporting=campaign.storefront_supporting_text||`Supporting ${campaign.organization.name}`
  return <section className="store-intro"><div>{campaign.organization.logoUrl&&<img src={campaign.organization.logoUrl} alt=""/>}<div><small>{eyebrow}</small><h1>{campaign.name}</h1><p>{campaign.description||`Shop official merchandise supporting ${campaign.organization.name}.`}</p><div className="store-intro-meta"><span><b>{supporting}</b></span>{end&&<span>Ends <b>{end.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</b></span>}</div></div></div>
    {campaign.goalAmount>0&&<aside><div><span>Fundraiser progress</span><b>{money(campaign.stats.netRaised)} raised</b></div><div className="store-goal"><i style={{width:`${campaign.stats.progress}%`}}/></div><small>{Math.round(campaign.stats.progress)}% of {money(campaign.goalAmount)} goal</small></aside>}
  </section>
}

export function campaignIsOpen(campaign:Campaign){
  const now=Date.now()
  return campaign.status==="active"&&(!campaign.starts_at||new Date(campaign.starts_at).getTime()<=now)&&(!campaign.ends_at||new Date(campaign.ends_at).getTime()>=now)
}

export function CampaignStorefront({campaign}:{campaign:Campaign}){
  const cart=useCampaignCart(campaign)
  const [cartOpen,setCartOpen]=useState(false)
  const [sort,setSort]=useState("featured")
  const products=useMemo(()=>{
    const copy=[...campaign.products]
    if(sort==="price-low")copy.sort((a,b)=>a.minPrice-b.minPrice)
    if(sort==="price-high")copy.sort((a,b)=>b.minPrice-a.minPrice)
    return copy
  },[campaign.products,sort])
  return <main className={"store-page"+(isDmdOrganization(campaign.organization)?" dmd-theme":" fundraiser-theme")}><StoreHeader campaign={campaign} count={cart.count} onCart={()=>setCartOpen(true)}/><CampaignIntro campaign={campaign}/>
    <section className="store-products"><div className="store-products-head"><div><small>SHOP THE COLLECTION</small><h2>{products.length} product{products.length===1?"":"s"}</h2></div>{products.length>5&&<label>Sort <select value={sort} onChange={event=>setSort(event.target.value)}><option value="featured">Featured</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option></select></label>}</div>
      {!campaignIsOpen(campaign)&&<div className="store-notice">This fundraiser is not currently accepting orders. You can still browse its merchandise.</div>}
      {campaignIsOpen(campaign)&&!campaign.shopifyConnected&&<div className="store-notice">Current prices are shown. Availability will be confirmed when you check out.</div>}
      <div className="store-product-grid">{products.map(product=><ProductCard key={product.id} campaign={campaign} product={product}/>)}</div>
      {!products.length&&<div className="store-empty"><h2>Products are coming soon</h2><p>This fundraiser&apos;s merchandise is still being prepared. Please check back shortly.</p></div>}
    </section><StoreFooter campaign={campaign}/><CartDrawer campaign={campaign} cart={cart} open={cartOpen} onClose={()=>setCartOpen(false)}/></main>
}

export function findVariant(product:StoreProduct,selected:Record<string,string>){
  if(!product.options.length)return product.variants[0]
  return product.variants.find(variant=>product.options.every(option=>variant.selectedOptions.some(selectedOption=>selectedOption.name===option.name&&selected[option.name]===selectedOption.value)))
}

export function StorefrontProductPage({campaign,product}:{campaign:Campaign;product:StoreProduct}){
  const cart=useCampaignCart(campaign)
  const [cartOpen,setCartOpen]=useState(false)
  const [selected,setSelected]=useState<Record<string,string>>(()=>Object.fromEntries(product.options.filter(option=>option.values.length===1).map(option=>[option.name,option.values[0]])))
  const [quantity,setQuantity]=useState(1)
  const [imageIndex,setImageIndex]=useState(-1)
  const [zoomed,setZoomed]=useState(false)
  const [message,setMessage]=useState("")
  const messageRef=useRef<HTMLDivElement>(null)
  const zoomRef=useDialogAccessibility<HTMLDivElement>(zoomed,()=>setZoomed(false))
  const variant=findVariant(product,selected)
  const activeImage=imageIndex >= 0 ? product.images[imageIndex]||product.images[0] : variant?.image||product.images[0]
  function valueAvailable(optionName:string,value:string){
    return product.variants.some(candidate=>candidate.available&&candidate.selectedOptions.every(option=>option.name===optionName?option.value===value:!selected[option.name]||selected[option.name]===option.value))
  }
  function add(){
    const missing=product.options.find(option=>!selected[option.name])
    if(missing){setMessage(`Please select ${missing.name.toLowerCase()}.`);messageRef.current?.focus();return}
    if(!variant||!variant.available){setMessage("That option is unavailable. Please choose another.");return}
    cart.add({productId:product.id,variantId:variant.id,productTitle:product.title,variantTitle:variant.title,image:activeImage?.url||null,quantity,price:variant.price,campaignId:campaign.id,organizationId:campaign.organization_id})
    emitStoreEvent("add_to_cart",{campaignId:campaign.id,productId:product.id,variantId:variant.id,quantity,value:variant.price*quantity})
    setMessage(`${product.title} was added to your cart.`)
  }
  return <main className={"store-page"+(isDmdOrganization(campaign.organization)?" dmd-theme":" fundraiser-theme")}><StoreHeader campaign={campaign} count={cart.count} onCart={()=>setCartOpen(true)}/><div className="store-product-page"><Link className="store-back" href={`/fundraisers/${campaign.slug}`}>← Back to all products</Link><div className="store-product-layout">
    <section className="store-gallery"><button className="store-main-image" onClick={()=>activeImage&&setZoomed(true)} aria-label="View larger product image"><ProductImage image={activeImage} title={product.title}/></button>{product.images.length>1&&<div className="store-thumbnails" aria-label="Product images">{product.images.map((image,index)=><button key={image.url} className={index===imageIndex?"active":""} onClick={()=>setImageIndex(index)} aria-label={`View image ${index+1}`}><ProductImage image={image} title={product.title}/></button>)}</div>}</section>
    <section className="store-product-info"><small>SUPPORTING {campaign.organization.name.toUpperCase()}</small><h1>{product.title}</h1><div className="store-detail-price">{money(variant?.price??product.minPrice)}{!variant&&product.minPrice!==product.maxPrice&&<span> – {money(product.maxPrice)}</span>}</div>{product.description&&<p className="store-description">{product.description}</p>}
      {product.options.map(option=><fieldset className={message&& !selected[option.name]?"store-option missing":"store-option"} key={option.name}><legend>{option.name}{selected[option.name]&&<b>{selected[option.name]}</b>}</legend><div>{option.values.map(value=><button type="button" key={value} className={selected[option.name]===value?"selected":""} disabled={!valueAvailable(option.name,value)} aria-pressed={selected[option.name]===value} onClick={()=>{setSelected(current=>({...current,[option.name]:value}));setImageIndex(-1);setMessage("")}}>{value}</button>)}</div></fieldset>)}
      <label className="store-detail-quantity">Quantity <select value={quantity} onChange={event=>setQuantity(Number(event.target.value))}>{[1,2,3,4,5,6,7,8,9,10].map(value=><option key={value}>{value}</option>)}</select></label>
      <div className="store-add-area"><button className="store-add" disabled={!product.available||!campaignIsOpen(campaign)} onClick={add}>{!campaignIsOpen(campaign)?"Fundraiser unavailable":product.available?`Add to cart · ${money((variant?.price??product.minPrice)*quantity)}`:"Sold out"}</button></div><div className="store-product-message" ref={messageRef} tabIndex={-1} aria-live="polite">{message}{message.includes("added")&&<span><button onClick={()=>setCartOpen(true)}>View cart</button><Link href={`/fundraisers/${campaign.slug}`}>Continue shopping</Link></span>}</div><div className="store-secure">Secure payment, taxes, and shipping completed through Shopify.</div>
    </section></div></div><StoreFooter campaign={campaign}/><CartDrawer campaign={campaign} cart={cart} open={cartOpen} onClose={()=>setCartOpen(false)}/>
    {zoomed&&activeImage&&<div ref={zoomRef} className="store-zoom" role="dialog" aria-modal="true" aria-label="Large product image" onClick={()=>setZoomed(false)}><button aria-label="Close image">×</button><img src={activeImage.url} alt={activeImage.altText||product.title}/></div>}
  </main>
}
