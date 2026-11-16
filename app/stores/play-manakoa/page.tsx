import Image from 'next/image'
import { getCampaignStorefront } from '@/lib/public/storefront'
import './store.css'
import '../../storefront.css'
import Volleyball from './Volleyball'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Play Manakoa | Team Store', description: 'The team store for Manakoa Volleyball and Manakoa Flag Football.' }

export default async function Page() {
  const [volleyball, football] = await Promise.all([
    getCampaignStorefront('manakoa-volleyball').catch(() => null),
    getCampaignStorefront('manakoa-flag-football').catch(() => null),
  ])
  const clubs = [
    { number:'01', name:'VOLLEYBALL', label:'Manakoa Volleyball Club', sub:'FOR THE COURT. FOR THE OHANA.', slug:'manakoa-volleyball', campaign:volleyball },
    { number:'02', name:'FLAG FOOTBALL', label:'Manakoa Flag Football Club', sub:'FOR THE FIELD. FOR THE OHANA.', slug:'manakoa-flag-football', campaign:football },
  ]
  return <div className="manakoa-store">
    <div className="mk-topline">OAKLAND, CALIFORNIA <span>◆</span> COURAGE. CULTURE. COMMUNITY.</div>
    <header className="mk-header"><a href="/stores/play-manakoa" aria-label="Play Manakoa team store home"><Image src="/brand/manakoa/logo.png" width={220} height={79} alt="Play Manakoa" priority /></a><nav aria-label="Store navigation"><a href="#clubs">Shop the clubs</a><a href="https://playmanakoa.org">Play Manakoa ↗</a></nav><a className="mk-nav-button" href="#clubs">EXPLORE THE STORE <span>↗</span></a></header>
    <main><section className="mk-hero"><div className="mk-hero-inner"><div className="mk-kicker"><span></span> THE PLAY MANAKOA TEAM STORE</div><h1>ONE OHANA.<br/><em>TWO TEAMS.</em><br/>ALL HEART.</h1><p>From the court to the field, represent the community that plays with courage, culture, and heart.</p><a className="mk-button" href="#clubs">FIND YOUR CLUB <span>↘</span></a><div className="mk-hero-bottom"><span>OAKLAND, CA</span><span>BUILT FOR THE MANAKOA OHANA</span><span>01 / 02</span></div></div><div className="mk-shark-hero" aria-label="Manakoa shark logo"><img src="/brand/manakoa/shark-art.png" alt="" /></div><div className="mk-vertical">PLAY WITH PURPOSE ◆ PLAY MANAKOA</div></section>
    <div className="mk-ticker" aria-hidden="true">COURAGE <b>◆</b> CULTURE <b>◆</b> COMMUNITY <b>◆</b> ONE OHANA <b>◆</b> COURAGE <b>◆</b> CULTURE <b>◆</b> COMMUNITY</div>
    <section className="mk-clubs" id="clubs"><div className="mk-heading"><div><p className="mk-label">CHOOSE YOUR TEAM / 01—02</p><h2>REP YOUR<br/><em>CLUB.</em></h2></div><p>Two clubs. One community.<br/>Find your team’s collection below.</p></div><div className="mk-grid">{clubs.map(club=><article className="mk-card" key={club.slug}><div className="mk-card-art"><span className="mk-card-number">{club.number} / MANAKOA</span><span className="mk-card-watermark" aria-hidden="true">{club.number}</span><div className="mk-sport-symbol" aria-hidden="true">{club.number==='01'?<span className="mk-shark-card"><img src="/brand/manakoa/shark-art.png" alt="" /></span>:'◆'}</div><span className="mk-card-caption">{club.sub}</span></div><div className="mk-card-body"><p>PLAY MANAKOA / {club.number}</p><h3>{club.name}</h3><span>{club.label}</span>{club.campaign && club.campaign.products.length > 0 ? <a href={club.slug==='manakoa-volleyball'?'#volleyball':`/fundraisers/${club.slug}`} className="mk-card-link">SHOP COLLECTION <span>↗</span></a> : <div className="mk-card-link mk-soon">COLLECTION COMING SOON <span>↗</span></div>}</div></article>)}</div></section>
    {volleyball && volleyball.products.length > 0 && <Volleyball campaign={volleyball} />}<section className="mk-story"><div><p className="mk-label">MORE THAN A GAME</p><h2>WHERE OHANA<br/><em>MEETS EXCELLENCE.</em></h2></div><p>On game day and every day, Manakoa is about showing up for your team and your community. Wear it with pride.</p></section></main>
    <footer className="mk-footer"><div><Image src="/brand/manakoa/logo.png" width={200} height={72} alt="Play Manakoa"/><p>COURAGE. CULTURE. COMMUNITY.</p></div><div><a href="#clubs">Our clubs</a><a href="https://playmanakoa.org">Play Manakoa ↗</a><a href="mailto:info@detroitdecalandapparel.com">Order support</a></div><div className="mk-footer-bottom"><span>PLAY MANAKOA TEAM STORE</span><span>PRODUCED BY DETROIT DECAL & APPAREL</span><a href="#">BACK TO TOP ↑</a></div></footer>
  </div>
}
