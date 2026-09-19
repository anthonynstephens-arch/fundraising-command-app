import Link from "next/link"
import {PublicHeader} from "@/components/public/PublicHeader"
import {PublicFooter} from "@/components/public/PublicFooter"
import {CampaignCardSlideshow} from "@/components/public/CampaignCardSlideshow"
import {getPublicCampaigns} from "@/lib/public/campaigns"

export const dynamic="force-dynamic"

const money=(v:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(v)

export default async function Page(){
 const campaigns=await getPublicCampaigns()

 return <main className="pub-page">
  <PublicHeader/>
  <section className="pub-section pub-top">
   <div className="pub-kicker">LIVE CAMPAIGNS</div>
   <h1>Support a crew. Back a cause.</h1>
   <p className="pub-lead">Shop active fundraisers and watch campaign progress update from real Shopify sales.</p>
   <div className="pub-campaign-grid">
    {campaigns.length?campaigns.map(c=>{
     const slides=[
      ...(c.organization.logoUrl?[{src:c.organization.logoUrl,alt:`${c.organization.name} logo`,fit:"contain" as const}]:c.hero_image_url?[{src:c.hero_image_url,alt:`${c.name} campaign`}]:[]),
      ...c.products.flatMap((product:any)=>[
       ...(product.imageUrl?[{src:product.imageUrl,alt:product.title}]:[]),
       ...(product.images||[]).map((image:any)=>({src:image.url,alt:image.altText||product.title})),
      ]),
     ].filter((slide,index,all)=>all.findIndex(item=>item.src===slide.src)===index)

     return <Link className="pub-campaign-card" href={`/fundraisers/${c.slug}`} key={c.id}>
      <CampaignCardSlideshow slides={slides}/>
      <div className="pub-card-body">
       <small>{c.organization.name}</small>
       <h2>{c.name}</h2>
       <p>{c.description||"Support this organization through its official fundraising store."}</p>
       <div className="pub-progress"><div style={{width:`${c.stats.progress}%`}}/></div>
       <div className="pub-stats"><strong>{money(c.stats.netRaised)} raised</strong><span>{c.goalAmount?`of ${money(c.goalAmount)}`:`${c.stats.orderCount} orders`}</span></div>
      </div>
     </Link>
    }):<div className="pub-empty">No public campaigns are active right now.</div>}
   </div>
  </section>
  <PublicFooter/>
 </main>
}
