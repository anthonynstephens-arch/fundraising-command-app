import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getCampaignStorefront } from '@/lib/public/storefront'
import Volleyball from '../Volleyball'
import '../store.css'
import '../../../storefront.css'

export const dynamic = 'force-dynamic'
export default async function ClubPage({params}:{params:Promise<{club:string}>}) {
  const {club}=await params
  if(club!=='volleyball' && club!=='flag-football') notFound()
  const name=club==='volleyball'?'Volleyball':'Flag Football'
  const campaign=await getCampaignStorefront(club==='volleyball'?'manakoa-volleyball':'manakoa-flag-football').catch(()=>null)
  return <div className="manakoa-store"><div className="mk-topline">PLAY MANAKOA ◆ TEAM SPIRIT STORE</div><header className="mk-header"><a href="/stores/play-manakoa" aria-label="Play Manakoa team store home"><Image src="/brand/manakoa/logo.png" width={220} height={79} alt="Play Manakoa" priority /></a><nav aria-label="Store navigation"><a href="/stores/play-manakoa#clubs">All clubs</a><a href="https://playmanakoa.org">Play Manakoa ↗</a></nav><a className="mk-nav-button" href="/stores/play-manakoa#clubs">ALL CLUBS ↗</a></header><main><div className="mk-collection-breadcrumb"><a href="/stores/play-manakoa#clubs">← ALL CLUBS</a><span>PLAY MANAKOA / {name.toUpperCase()}</span></div>{campaign && campaign.products.length>0 ? <Volleyball campaign={campaign} club={club} /> : <section className="mk-collection-empty"><p className="mk-label">MANAKOA {name.toUpperCase()}</p><h1>COMING SOON.</h1><p>Our {name} collection is on its way. Check back soon for team spirit wear.</p><a className="mk-button" href="/stores/play-manakoa#clubs">EXPLORE THE CLUBS ↗</a></section>}</main><footer className="mk-footer"><div><Image src="/brand/manakoa/logo.png" width={200} height={72} alt="Play Manakoa"/><p>COURAGE. CULTURE. COMMUNITY.</p></div><div><a href="/stores/play-manakoa#clubs">All clubs</a><a href="mailto:info@detroitdecalandapparel.com">Order support</a></div><div className="mk-footer-bottom"><span>PLAY MANAKOA TEAM STORE</span><span>PRODUCED BY DETROIT DECAL & APPAREL</span></div></footer></div>
}
