"use client"

import Image from "next/image"
import {useEffect,useMemo,useState} from "react"

type ReviewValue={name:string;markup:number}

const PRODUCTS=[
  {id:"cultivator-zip",garment:"Stanley/Stella Unisex Cultivator 2.0 Full-Zip Hooded Sweatshirt",style:"SXU005 · Natural Raw",basePrice:49,image:"/brand/dmd/review/image-gen-1(20260920-044127).webp"},
  {id:"comfort-colors-tee",garment:"Comfort Colors Heavyweight Ring Spun Tee",style:"1717 · Hemp",basePrice:18,image:"/brand/dmd/review/image-gen-2(20260920-044128).webp"},
  {id:"youth-softstyle",garment:"Gildan Youth Softstyle Shirt",style:"Forest",basePrice:14,image:"/brand/dmd/review/image-gen-3(9).webp"},
  {id:"softstyle-crewneck",garment:"Gildan Softstyle Midweight Unisex Crewneck",style:"Forest Green",basePrice:28,image:"/brand/dmd/review/image-gen-4(7).webp"},
  {id:"long-sleeve",garment:"Port & Co Long Sleeve Core Cotton Tee",style:"PC54LS",basePrice:19,image:"/brand/dmd/review/image-gen-5(5).webp"},
  {id:"pocketed-short",garment:"Sport-Tek PosiCharge Competitor 7 Pocketed Short",style:"ST349P",basePrice:21,image:"/brand/dmd/review/image-gen-6(5).webp"},
  {id:"comfort-colors-hoodie",garment:"Comfort Colors Ring Spun Hooded Sweatshirt",style:"1567 · Light Green",basePrice:49,image:"/brand/dmd/review/image-gen-7(5).webp"},
  {id:"youth-full-zip",garment:"Port & Co Youth Core Fleece Full-Zip Hooded Sweatshirt",style:"PC78YZH · Dark Green",basePrice:29,image:"/brand/dmd/review/image-gen-8(4).webp"},
  {id:"youth-track-jacket",garment:"Sport-Tek Youth Tricot Sleeve Stripe Track Jacket",style:"YST90 · Black/Black",basePrice:38,image:"/brand/dmd/review/image-gen-9(3).webp"},
  {id:"womens-track-jacket",garment:"Sport-Tek Women’s Tricot Track Jacket",style:"LST90 · Black/Black",basePrice:39,image:"/brand/dmd/review/image-gen-10(2).webp"},
] as const

const STORAGE_KEY="fundraiser-command:dmd-product-review:v1"
const RATE=.25
const dollars=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2})

function defaults(){
  return Object.fromEntries(PRODUCTS.map(product=>[product.id,{name:"",markup:0}])) as Record<string,ReviewValue>
}

export default function DmdProductReview({organizationId}:{organizationId:string}){
  const [values,setValues]=useState<Record<string,ReviewValue>>(defaults)
  const [ready,setReady]=useState(false)
  const [dirty,setDirty]=useState(false)
  const [saveState,setSaveState]=useState<"loading"|"saved"|"saving"|"error">("loading")

  useEffect(()=>{
    const controller=new AbortController()
    async function load(){
      let next=defaults()
      try{
        const stored=window.localStorage.getItem(STORAGE_KEY)
        if(stored){
          const parsed=JSON.parse(stored) as Record<string,Partial<ReviewValue>>
          next=Object.fromEntries(PRODUCTS.map(product=>[product.id,{
            name:typeof parsed[product.id]?.name==="string"?parsed[product.id]!.name!:"",
            markup:Number.isFinite(Number(parsed[product.id]?.markup))?Math.max(0,Number(parsed[product.id]?.markup)):0,
          }]))
        }
      }catch{/* The shared record below remains authoritative. */}
      try{
        const response=await fetch(`/api/portal/dmd-product-reviews?organizationId=${encodeURIComponent(organizationId)}`,{signal:controller.signal,cache:"no-store"})
        const result=await response.json()
        if(!response.ok)throw new Error(result.error||"Unable to load review")
        for(const review of result.reviews||[]){
          if(next[review.product_key])next[review.product_key]={name:String(review.display_name||""),markup:Math.max(0,Number(review.markup)||0)}
        }
        setSaveState("saved")
      }catch(error){
        if((error as Error).name==="AbortError")return
        setSaveState("error")
      }
      setValues(next)
      setReady(true)
    }
    load()
    return ()=>controller.abort()
  },[organizationId])

  useEffect(()=>{
    if(ready)window.localStorage.setItem(STORAGE_KEY,JSON.stringify(values))
  },[ready,values])

  useEffect(()=>{
    if(!ready||!dirty)return
    const controller=new AbortController()
    const timer=window.setTimeout(async()=>{
      setSaveState("saving")
      try{
        const response=await fetch("/api/portal/dmd-product-reviews",{method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify({organizationId,reviews:PRODUCTS.map(product=>({productKey:product.id,...values[product.id]}))})})
        const result=await response.json()
        if(!response.ok)throw new Error(result.error||"Unable to save review")
        setDirty(false)
        setSaveState("saved")
      }catch(error){
        if((error as Error).name!=="AbortError")setSaveState("error")
      }
    },600)
    return ()=>{window.clearTimeout(timer);controller.abort()}
  },[dirty,organizationId,ready,values])

  const totals=useMemo(()=>PRODUCTS.reduce((result,product)=>{
    const markup=values[product.id]?.markup||0
    result.retail+=product.basePrice+markup
    result.net+=markup*(1-RATE)
    return result
  },{retail:0,net:0}),[values])

  function update(id:string,field:keyof ReviewValue,value:string|number){
    setValues(current=>({...current,[id]:{...current[id],[field]:value}}))
    setDirty(true)
  }

  return <section className="dmd-review">
    <header className="dmd-review-head">
      <div><small>COLLECTION REVIEW</small><h1>Name and price the DMD collection</h1><p>Enter the customer-facing name and DMD markup for each garment. The 25% deduction is applied only to DMD&apos;s added markup.</p></div>
      <aside><span>DMD keeps</span><strong>75%</strong><small>of each added markup</small></aside>
    </header>

    <div className="dmd-review-summary" aria-label="Pricing summary">
      <div><span>Products to review</span><strong>{PRODUCTS.length}</strong></div>
      <div><span>Combined customer prices</span><strong>{dollars.format(totals.retail)}</strong></div>
      <div><span>Combined DMD net per set</span><strong>{dollars.format(totals.net)}</strong></div>
      <div><span>Pricing rule</span><strong>25% of markup only</strong></div>
    </div>

    <div className="dmd-review-grid">
      {PRODUCTS.map((product,index)=>{
        const value=values[product.id]||{name:"",markup:0}
        const fee=value.markup*RATE
        const net=value.markup-fee
        const customerPrice=product.basePrice+value.markup
        return <article className="dmd-review-card" key={product.id}>
          <div className="dmd-review-image">
            <Image src={product.image} alt={`${product.garment} DMD mockup`} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" priority={index<2}/>
            <span>{String(index+1).padStart(2,"0")}</span>
          </div>
          <div className="dmd-review-body">
            <div className="dmd-garment"><small>GARMENT</small><h2>{product.garment}</h2><p>{product.style}</p></div>
            <label className="dmd-review-field"><span>What should this item be called?</span><input disabled={!ready} value={value.name} onChange={event=>update(product.id,"name",event.target.value)} placeholder="Enter the name customers will see" maxLength={90}/></label>
            <div className="dmd-price-builder">
              <div><span>Detroit Decal base price</span><strong>{dollars.format(product.basePrice)}</strong></div>
              <label><span>DMD added markup</span><div className="dmd-money-input"><i>$</i><input disabled={!ready} type="number" inputMode="decimal" min="0" step="0.50" value={value.markup||""} placeholder="0.00" onChange={event=>update(product.id,"markup",Math.max(0,Number(event.target.value)||0))}/></div></label>
              <div className="dmd-customer-price"><span>Customer price</span><strong>{dollars.format(customerPrice)}</strong></div>
              <div><span>25% deduction on markup</span><strong>−{dollars.format(fee)}</strong></div>
              <div className="dmd-net"><span>DMD receives per sale</span><strong>{dollars.format(net)}</strong></div>
            </div>
          </div>
        </article>
      })}
    </div>
    <p className={`dmd-review-save ${saveState}`} role="status">{saveState==="loading"?"Loading the shared DMD review…":saveState==="saving"?"Saving review choices…":saveState==="error"?"Could not reach shared storage. Choices remain saved on this device.":"Names and pricing are saved to the shared DMD review."}</p>
  </section>
}
