'use client'
import {useEffect,useRef,useState} from 'react'
import {usePathname,useRouter} from 'next/navigation'
import {useDialogAccessibility} from '@/components/public/useDialogAccessibility'
import InstallGuide from './InstallGuide'
const steps=[
 {title:'Your campaign, at a glance',body:'See sales, fundraising proceeds and orders together. Let’s take a quick tour.',route:'',target:'.agency-kpis',action:'Explore the dashboard',symbol:'▦'},
 {title:'Give your team a goal',body:'Use Campaign Progress to set a target. Managers can edit goals; viewers can follow along.',route:'/progress',target:'.agency-goal-editor',action:'Open Campaign Progress',symbol:'◎'},
 {title:'Follow every order',body:'Review purchases, items and fulfillment. This tour never changes an order.',route:'/orders',target:'.agency-table-wrap',action:'Open Orders',symbol:'◇'},
 {title:'Know what’s available',body:'Payouts separates earned, pending, paid and available funds. Request controls depend on your role and eligible balance.',route:'/payouts',target:'.agency-kpis',action:'Open Payouts',symbol:'$'},
 {title:'Make the store yours',body:'Account Settings contains the Store Header editor. Update your message and preview what supporters see.',route:'/settings',target:'.agency-storefront-editor',action:'Open Store Header',symbol:'✎'},
 {title:'Choose what reaches you',body:'Choose your updates in Notifications. Device alerts require permission on each phone or computer.',route:'/notifications',target:'.portal-notifications',action:'Set up notifications',symbol:'◉'},
 {title:'One tap from your Home Screen',body:'On iPhone, install first and enable device notifications from the installed app.',route:'/notifications',target:'.fc-install-guide',action:'Show installation steps',symbol:'↗'}
]
export default function PortalOnboarding({organizationId,query}:{organizationId:string;query:string}){
 const router=useRouter(),path=usePathname()
 const [open,setOpen]=useState(false),[step,setStep]=useState(0),[exploring,setExploring]=useState(false),[error,setError]=useState(''),[saving,setSaving]=useState(false),[goal,setGoal]=useState(2500)
 const [rect,setRect]=useState<{top:number;left:number;width:number;height:number}|null>(null)
 const key=useRef(''),title=useRef<HTMLHeadingElement>(null)
 function remember(value:object){try{if(key.current)sessionStorage.setItem(key.current,JSON.stringify(value))}catch{}}
 function pause(){setOpen(false);setExploring(false);setRect(null);remember({step,paused:true})}
 const dialog=useDialogAccessibility<HTMLElement>(open&&!exploring,pause)
 useEffect(()=>{
 let live=true
 fetch('/api/portal/preferences?organizationId='+encodeURIComponent(organizationId)).then(async r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{
 if(!live)return
 key.current='fc-tour-v2:'+organizationId+':'+data.identityKey
 let saved:any=null;try{saved=JSON.parse(sessionStorage.getItem(key.current)||'null')}catch{}
 if(saved){setStep(Math.max(0,Math.min(steps.length-1,saved.step||0)));setOpen(!saved.paused);setExploring(!!saved.exploring)}
 else if(!data.preferences?.onboarding_completed_at||data.preferences.onboarding_version<2)setOpen(true)
 }).catch(()=>{})
 const replay=()=>{setStep(0);setExploring(false);setOpen(true);setError('')}
 window.addEventListener('fc-replay-tour',replay)
 return()=>{live=false;window.removeEventListener('fc-replay-tour',replay)}
 },[organizationId])
 useEffect(()=>{if(open)remember({step,exploring,paused:false})},[open,step,exploring])
 useEffect(()=>{if(open&&!exploring)title.current?.focus()},[step,open,exploring])
 useEffect(()=>{
 if(!open||!exploring){setRect(null);return}
 const locate=()=>{const el=document.querySelector(steps[step].target);if(!el){setRect(null);return}const r=el.getBoundingClientRect();setRect({top:Math.max(4,r.top),left:Math.max(4,r.left),width:Math.min(r.width,innerWidth-8),height:Math.max(0,Math.min(r.height,innerHeight-230))})}
 const timer=setTimeout(()=>{document.querySelector(steps[step].target)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});locate()},350)
 window.addEventListener('resize',locate);window.addEventListener('scroll',locate,true)
 return()=>{clearTimeout(timer);window.removeEventListener('resize',locate);window.removeEventListener('scroll',locate,true)}
 },[step,path,open,exploring])
 async function finish(){setSaving(true);setError('');try{const r=await fetch('/api/portal/preferences',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({organizationId,onboardingCompleted:true})});if(!r.ok)throw Error();remember({step:0,paused:true});setOpen(false);setExploring(false)}catch{setError('Could not save completion. Please try again.')}finally{setSaving(false)}}
 function show(){remember({step,exploring:true,paused:false});setExploring(true);router.push('/portal'+steps[step].route+query)}
 if(!open)return null
 const current=steps[step]
 if(exploring)return <>{rect&&<div className="fc-tour-spotlight" aria-hidden="true" style={rect}/>}<aside className="fc-tour-dock" aria-label="Guided walkthrough"><div><small>GUIDED TOUR · {step+1}/{steps.length}</small><strong>{current.title}</strong><span>Explore this screen, then continue.</span></div><div><button type="button" onClick={()=>setExploring(false)}>Instructions</button><button type="button" className="fc-tour-primary" disabled={saving} onClick={()=>{setExploring(false);if(step<steps.length-1)setStep(step+1);else void finish()}}>{step===steps.length-1?'Finish':'Next step'}</button><button type="button" onClick={pause} aria-label="Close walkthrough">×</button></div></aside></>
 return <div className="fc-tour-overlay"><section ref={dialog} className="fc-guided-tour" role="dialog" aria-modal="true" aria-labelledby="fc-guide-title"><button className="fc-tour-close" type="button" aria-label="Close walkthrough" onClick={pause}>×</button><div className="fc-tour-progress" aria-label={'Step '+(step+1)+' of '+steps.length}>{steps.map((s,i)=><button type="button" key={s.title} aria-label={'Go to step '+(i+1)+': '+s.title} aria-current={i===step?'step':undefined} className={i<=step?'active':''} onClick={()=>setStep(i)}/>)}</div>
 <div className="fc-tour-animated" key={step}><span className="fc-tour-symbol" aria-hidden="true">{current.symbol}</span><small className="fc-tour-eyebrow">STEP {step+1} OF {steps.length}</small><h2 id="fc-guide-title" ref={title} tabIndex={-1}>{current.title}</h2><p>{current.body}</p>
 {step===0&&<div className="fc-tour-demo"><div><span>Sales</span><b>$1,250</b></div><div><span>Raised</span><b>$250</b></div><div><span>Orders</span><b>24</b></div><small>Illustrative example</small></div>}
 {step===1&&<div className="fc-tour-practice"><label>Try an example goal: <strong>${goal.toLocaleString()}</strong><input type="range" min="500" max="10000" step="500" value={goal} onChange={e=>setGoal(Number(e.target.value))}/></label><small>Practice only. Your campaign goal won’t change.</small><div><i style={{width:Math.min(100,1000/goal*100)+'%'}}/></div></div>}
 {step===6&&<InstallGuide/>}</div>{error&&<p role="alert">{error}</p>}<div className="fc-tour-actions">{step>0&&<button type="button" onClick={()=>setStep(step-1)}>Back</button>}<button type="button" onClick={show}>{current.action} →</button><button className="fc-tour-primary" type="button" disabled={saving} onClick={()=>step<steps.length-1?setStep(step+1):void finish()}>{saving?'Saving…':step===steps.length-1?'Finish tour':'Next'}</button></div><button type="button" className="fc-tour-later" onClick={pause}>Continue later · replay from the menu anytime</button></section></div>
}
