import {notFound} from "next/navigation"
import {PublicHeader} from "@/components/public/PublicHeader"
import {PublicFooter} from "@/components/public/PublicFooter"
import {getPublicCampaign} from "@/lib/public/campaigns"
export const dynamic="force-dynamic"
const money=(v:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(v)

function campaignTiming(startsAt:string|null,endsAt:string|null){
  const now=Date.now()
  const start=startsAt?new Date(startsAt).getTime():null
  const end=endsAt?new Date(endsAt).getTime():null
  const total=start&&end?Math.max(1,Math.ceil((end-start)/86400000)):0
  const elapsed=start?Math.max(0,Math.ceil((now-start)/86400000)):0
  const remaining=end?Math.max(0,Math.ceil((end-now)/86400000)):0
  const percent=total?Math.max(0,Math.min(100,(elapsed/total)*100)):0
  const upcoming=!!start&&now<start
  const ended=!!end&&now>end
  return {total,elapsed,remaining,percent,upcoming,ended}
}

export default async function Page({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params; const c:any=await getPublicCampaign(slug); if(!c) notFound()
 const timing=campaignTiming(c.starts_at,c.ends_at)
 const startLabel=c.starts_at?new Date(c.starts_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"—"
 const endLabel=c.ends_at?new Date(c.ends_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"—"
 const untilStart=c.starts_at?Math.max(0,Math.ceil((new Date(c.starts_at).getTime()-Date.now())/86400000)):0
 const countdownLabel=timing.upcoming?(untilStart+" days until launch"):timing.ended?"Campaign ended":(timing.remaining+" days remaining")
 return <main className="pub-page"><PublicHeader/>
 <section className="pub-campaign-hero"><div><div className="pub-kicker">{c.organization.name}</div><h1>{c.name}</h1><p>{c.description||"Support this organization by shopping its official fundraiser."}</p><div className="pub-campaign-dates"><span><b>{startLabel}</b> Start</span><span><b>{endLabel}</b> End</span><span><b>{countdownLabel}</b> Timeline</span></div><div className="pub-actions">{c.storeUrl&&<a className="pub-primary" href={c.storeUrl} target="_blank" rel="noreferrer">Shop the Fundraiser</a>}<a className="pub-secondary" href="#products">View Products</a></div></div>
 <aside className="pub-fund-card"><small>RAISED SO FAR</small><strong>{money(c.stats.netRaised)}</strong><span>{c.goalAmount?("Goal: "+money(c.goalAmount)):"Live campaign total"}</span><div className="pub-progress big"><div style={{width:c.stats.progress+"%"}}/></div><div className="pub-metric-row"><div><b>{c.stats.orderCount}</b><span>Orders</span></div><div><b>{timing.remaining}</b><span>Days Left</span></div><div><b>{money(c.stats.sales)}</b><span>Sales</span></div></div><div className="pub-time-progress"><span>Campaign timeline</span><b>{timing.ended?"100%":(Math.round(timing.percent)+"%")}</b><div><i style={{width:(timing.ended?100:timing.percent)+"%"}}/></div></div></aside></section>
 <section className="pub-section" id="products"><div className="pub-section-head"><div><div className="pub-kicker">OFFICIAL CAMPAIGN GEAR</div><h2>Shop the fundraiser</h2></div>{c.storeUrl&&<a href={c.storeUrl} target="_blank" rel="noreferrer">View full Shopify collection →</a>}</div>
 <div className="pub-product-grid">{c.products.map((p:any)=><article className="pub-product-card" key={p.productId}><a href={p.productUrl||c.storeUrl||"#"} target="_blank" rel="noreferrer"><div className="pub-product-image">{p.imageUrl?<img src={p.imageUrl} alt={p.title}/>:<span>CAMPAIGN GEAR</span>}</div></a><div className="pub-product-body"><h3>{p.title}</h3><p className="pub-price">{p.minPrice===p.maxPrice?money(p.minPrice):(money(p.minPrice)+" – "+money(p.maxPrice))}</p><p>{p.variants.length} available options</p><a className="pub-product-btn" href={p.productUrl||c.storeUrl||"#"} target="_blank" rel="noreferrer">Choose Options</a></div></article>)}</div>
 {!c.products.length&&<div className="pub-empty">Campaign products are being prepared. Check back soon.</div>}</section>
 <section className="pub-strip"><div><div className="pub-kicker">WHY IT MATTERS</div><h2>Your order supports the campaign.</h2><p>Qualifying campaign items are tracked automatically so the organization can see real progress.</p></div>{c.storeUrl&&<a className="pub-primary" href={c.storeUrl} target="_blank" rel="noreferrer">Shop Now</a>}</section>
 <PublicFooter/></main>
}