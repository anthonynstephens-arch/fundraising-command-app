'use client'
import { useRef, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import s from './landing.module.css'

export function LandingHeader() {
 const [open,setOpen]=useState(false)
 return <header className={s.header}><div className={s.wrap+' '+s.headerInner}>
  <Link href="/" className={s.logo} aria-label="Fundraiser Command home"><Image src="/brand/fundraiser-command-header.webp" alt="Fundraiser Command" width={226} height={68} priority sizes="(max-width: 600px) 170px, 210px"/></Link>
  <button className={s.menuButton} type="button" aria-expanded={open} aria-controls="fc-landing-nav" onClick={()=>setOpen(!open)}>{open?'Close':'Menu'} <span aria-hidden="true">{open?'×':'☰'}</span></button>
  <nav id="fc-landing-nav" className={s.nav+' '+(open?s.navOpen:'')} aria-label="Main navigation" onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);document.querySelector<HTMLButtonElement>('[aria-controls="fc-landing-nav"]')?.focus()}}}>
   <a href="#platform" onClick={()=>setOpen(false)}>The platform</a><a href="#how-it-works" onClick={()=>setOpen(false)}>How it works</a><Link href="/fundraisers">Find a fundraiser</Link><Link href="/login" className={s.login}>Log in</Link><Link href="/apply" className={s.navCta}>Start a fundraiser <span aria-hidden="true">↗</span></Link>
  </nav>
 </div></header>
}
const tabs=['Overview','Orders','Payouts'] as const
const sales=[400,560,780,1100,1480,1840,2300]
export function CampaignPreview(){
 const [tab,setTab]=useState(0)
 const refs=useRef<(HTMLButtonElement|null)[]>([])
 function change(event:KeyboardEvent<HTMLButtonElement>,index:number){
  let next:number
  if(event.key==='ArrowRight')next=(index+1)%tabs.length
  else if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length
  else if(event.key==='Home')next=0
  else if(event.key==='End')next=tabs.length-1
  else return
  event.preventDefault();setTab(next);refs.current[next]?.focus()
 }
 return <div className={s.dashboard}>
  <div className={s.dashHeader}><div className={s.orgIcon} aria-hidden="true">C</div><div><strong>Community apparel fundraiser</strong><span>Campaign command center</span></div><span className={s.sampleBadge}>Sample</span></div>
  <div className={s.tabList} role="tablist" aria-label="Campaign preview sections">{tabs.map((name,index)=><button type="button" role="tab" id={`fc-tab-${index}`} aria-selected={tab===index} aria-controls={`fc-panel-${index}`} tabIndex={tab===index?0:-1} ref={el=>{refs.current[index]=el}} onClick={()=>setTab(index)} onKeyDown={e=>change(e,index)} key={name}>{name}</button>)}</div>
  {tabs.map((name,index)=><div role="tabpanel" id={`fc-panel-${index}`} aria-labelledby={`fc-tab-${index}`} tabIndex={0} hidden={tab!==index} className={s.tabPanel} key={name}>
   {index===0?<>
    <div className={s.dashTitle}><h2>A clear view of your impact.</h2><span>Campaign overview</span></div>
    <div className={s.kpis}><div><span>Gross sales</span><strong>$8,460</strong><small>Across your campaign</small></div><div><span>Campaign proceeds</span><strong>$1,692</strong><small>Illustrative 20% contribution</small></div><div><span>Orders</span><strong>214</strong><small>Community support in action</small></div></div>
    <div className={s.chartCard}><div><strong>Campaign sales</strong><span>7 sample periods</span></div><div className={s.chart} role="img" aria-label="Illustrative sales across seven periods: 400, 560, 780, 1100, 1480, 1840, and 2300 dollars, totaling 8460 dollars.">{sales.map((value,i)=><div key={i}><i style={{height:`${value/2300*100}%`}}/><span>{i+1}</span></div>)}</div></div>
    <div className={s.goal}><div><strong>Every order moves you forward.</strong><span>$1,692 of $2,500 goal <b>68%</b></span></div><div className={s.progress} role="progressbar" aria-label="Sample campaign goal" aria-valuenow={68} aria-valuemin={0} aria-valuemax={100}><i/></div></div>
   </>:index===1?<>
    <div className={s.dashTitle}><h2>Every order. One place.</h2><span>Illustrative order activity</span></div>
    <div className={s.orderRows}>{[['DEMO-0214','Awareness tee','Processing'],['DEMO-0213','Community hoodie','Shipped'],['DEMO-0212','Awareness tee','Delivered'],['DEMO-0211','Community hoodie','Delivered']].map(([id,product,status])=><div key={id}><span className={s.orderIcon} aria-hidden="true">↗</span><div><strong>{product}</strong><small>{id}</small></div><span className={s.orderStatus}>{status}</span></div>)}</div>
    <div className={s.previewNote}><strong>Less chasing. More clarity.</strong><p>Follow campaign orders and find the information your supporters ask for.</p></div>
   </>:<>
    <div className={s.dashTitle}><h2>Your proceeds, accounted for.</h2><span>Illustrative payout summary</span></div>
    <div className={s.payoutTotal}><span>Campaign proceeds</span><strong>$1,692.00</strong><small>Example contribution structure: 20% of $8,460</small></div>
    <div className={s.payoutRow}><span>Already paid out</span><strong>$400.00</strong></div><div className={s.payoutRow}><span>Remaining proceeds</span><strong>$1,292.00</strong></div>
    <div className={s.previewNote}><strong>Know what your campaign has earned.</strong><p>Contribution terms and payout timing are confirmed for your campaign.</p></div>
   </>}
  </div>)}
  <div className={s.dashFooter}><span>Illustrative data · Not a live campaign</span><Link href="/demo/breast-cancer-awareness">Open full demo <span aria-hidden="true">↗</span></Link></div>
 </div>
}
