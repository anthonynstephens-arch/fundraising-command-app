"use client"

import { useEffect,useMemo,useRef,useState } from "react"
import QRCode from "qrcode"

type Product={id:string;title:string;image?:string|null;price:number;qty:number;gross:number;raised:number}
type TrackingLink={id:string;channel:string;share_url:string;clicks:number}
type Activity={id:string;action:string;label:string;created_at:string}
type Template={id:string;name:string;kind:string;content:string}

function copyText(text:string,setNotice:(s:string)=>void,label:string){
  navigator.clipboard.writeText(text).then(()=>{setNotice(label);setTimeout(()=>setNotice(""),1800)}).catch(()=>setNotice("Copy failed"))
}
function downloadCanvas(canvas:HTMLCanvasElement|null,name:string){
  if(!canvas)return
  const a=document.createElement("a");a.href=canvas.toDataURL("image/png");a.download=name;a.click()
}
function wrap(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,max:number,lineHeight:number,maxLines=5){
  const words=text.split(" ");let line="";let lines=0
  for(let i=0;i<words.length;i++){
    const test=line+words[i]+" "
    if(ctx.measureText(test).width>max&&line){
      ctx.fillText(line.trim(),x,y);y+=lineHeight;line=words[i]+" ";lines++
      if(lines>=maxLines-1){line=words.slice(i).join(" ");break}
    }else line=test
  }
  if(line)ctx.fillText(line.trim(),x,y)
}
function initials(name:string){return name.split(/\s+/).map(x=>x[0]).join("").slice(0,3).toUpperCase()}
function dayLabel(value:Date){return value.toLocaleDateString("en-US",{month:"short",day:"numeric"})}

export default function MarketingTools({
  campaignId,organizationId,url,orgName,orgLogo,campaignName,daysRemaining,pct,raised,goal,startsAt,endsAt,products,last3Sales,previous3Sales
}:{
  campaignId:string;organizationId:string;url:string;orgName:string;orgLogo?:string|null;campaignName:string;daysRemaining:number;pct:number;raised:string;goal:string;
  startsAt?:string|null;endsAt?:string|null;products:Product[];last3Sales:number;previous3Sales:number
}){
  const [notice,setNotice]=useState("")
  const [copyTone,setCopyTone]=useState<"short"|"social"|"email">("social")
  const [tracking,setTracking]=useState<TrackingLink[]>([])
  const [activity,setActivity]=useState<Activity[]>([])
  const [templates,setTemplates]=useState<Template[]>([])
  const [templateName,setTemplateName]=useState("")
  const [customCopy,setCustomCopy]=useState("")
  const [milestone,setMilestone]=useState(50)
  const [productId,setProductId]=useState(products[0]?.id||"")
  const [loadingChannel,setLoadingChannel]=useState("")
  const qrCanvas=useRef<HTMLCanvasElement>(null)
  const squareCanvas=useRef<HTMLCanvasElement>(null)
  const storyCanvas=useRef<HTMLCanvasElement>(null)
  const flyerCanvas=useRef<HTMLCanvasElement>(null)
  const milestoneCanvas=useRef<HTMLCanvasElement>(null)
  const productCanvas=useRef<HTMLCanvasElement>(null)

  const safePct=Math.max(0,Math.min(100,pct||0))
  const startDate=startsAt?new Date(startsAt):null
  const endDate=endsAt?new Date(endsAt):null
  const startLabel=startDate?dayLabel(startDate):"TBD"
  const endLabel=endDate?endDate.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"TBD"
  const finalWeek=daysRemaining>0&&daysRemaining<=7
  const final48=daysRemaining>0&&daysRemaining<=2
  const slowing=previous3Sales>0&&last3Sales<previous3Sales*.5
  const selectedProduct=products.find(p=>p.id===productId)||products[0]
  const qrUrl=tracking.find(x=>x.channel==="qr")?.share_url||url

  const campaignMessage=final48
    ?"FINAL 48 HOURS: "+orgName+"'s "+campaignName+" fundraiser ends soon. Shop before the campaign closes: "+url
    :finalWeek
      ?"FINAL WEEK: Only "+daysRemaining+" days remain in "+orgName+"'s "+campaignName+" fundraiser. Help us finish strong: "+url
      :"Help us make an impact. "+orgName+"'s "+campaignName+" fundraiser is live now. We are "+safePct.toFixed(0)+"% of the way to our "+goal+" goal with "+daysRemaining+" days remaining. Shop here: "+url

  const copies=useMemo(()=>({
    short:"Support "+orgName+"'s "+campaignName+" fundraiser. "+(finalWeek?daysRemaining+" days left. ":"")+"Shop here: "+url,
    social:campaignMessage,
    email:"Subject: "+(finalWeek?"Final week to support ":"Support ")+orgName+" — "+campaignName+"\n\nHi,\n\nOur "+campaignName+" fundraiser is live. We are currently at "+safePct.toFixed(0)+"% of our "+goal+" fundraising goal with "+daysRemaining+" days remaining.\n\nEvery eligible campaign purchase helps support the fundraiser.\n\nShop the campaign: "+url+"\n\nThank you for supporting "+orgName+"."
  }),[orgName,campaignName,url,safePct,goal,daysRemaining,finalWeek,campaignMessage])

  async function loadMarketing(){
    if(!campaignId||!organizationId)return
    const res=await fetch("/api/portal/marketing?campaignId="+encodeURIComponent(campaignId)+"&organizationId="+encodeURIComponent(organizationId))
    if(!res.ok)return
    const data=await res.json()
    setTracking(data.links||[]);setActivity(data.activity||[]);setTemplates(data.templates||[])
  }
  useEffect(()=>{loadMarketing()},[campaignId,organizationId])

  async function logActivity(event:string,label:string,metadata:any={}){
    if(!campaignId)return
    await fetch("/api/portal/marketing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"activity",campaignId,organizationId,event,label,metadata})})
    loadMarketing()
  }

  async function createTracking(channel:string){
    if(!url)return
    setLoadingChannel(channel)
    const res=await fetch("/api/portal/marketing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"tracking_link",campaignId,organizationId,channel,targetUrl:url})})
    const data=await res.json();setLoadingChannel("")
    if(!res.ok){setNotice(data.error||"Unable to create link");return}
    await loadMarketing()
    copyText(data.link.share_url,setNotice,channel+" tracking link copied")
    logActivity("tracking_link_created",channel+" tracking link")
  }

  async function saveTemplate(){
    if(!templateName.trim()||!customCopy.trim()){setNotice("Add a template name and copy first.");return}
    const res=await fetch("/api/portal/marketing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save_template",campaignId,organizationId,name:templateName,kind:"custom",content:customCopy})})
    const data=await res.json()
    if(!res.ok){setNotice(data.error||"Unable to save template");return}
    setTemplateName("");setCustomCopy("");setNotice("Template saved");loadMarketing()
  }

  async function deleteTemplate(id:string){
    await fetch("/api/portal/marketing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"delete_template",campaignId,organizationId,id})})
    loadMarketing()
  }

  useEffect(()=>{if(qrCanvas.current&&qrUrl)QRCode.toCanvas(qrCanvas.current,qrUrl,{width:220,margin:1,color:{dark:"#0b1f33",light:"#ffffff"}})},[qrUrl])

  useEffect(()=>{
    const render=(canvas:HTMLCanvasElement|null,w:number,h:number,mode:"square"|"story"|"flyer")=>{
      if(!canvas)return
      canvas.width=w;canvas.height=h
      const ctx=canvas.getContext("2d");if(!ctx)return
      const dark="#101820",pink="#ed4f9a",soft="#f8d7e7",white="#ffffff",muted="#c9d1da"
      ctx.fillStyle=dark;ctx.fillRect(0,0,w,h)
      const grad=ctx.createLinearGradient(0,0,w,h);grad.addColorStop(0,"rgba(237,79,154,.30)");grad.addColorStop(.45,"rgba(237,79,154,.04)");grad.addColorStop(1,"rgba(255,255,255,0)")
      ctx.fillStyle=grad;ctx.fillRect(0,0,w,h)
      const pad=mode==="story"?90:74
      ctx.fillStyle=pink;ctx.fillRect(pad,pad,150,10)
      ctx.font=(mode==="story"?"800 32px":"800 24px")+" Arial";ctx.fillStyle=soft;ctx.fillText(initials(orgName)+"  •  FUNDRAISER",pad,pad+58)
      if(orgLogo){const img=new Image();img.crossOrigin="anonymous";img.onload=()=>{try{ctx.save();ctx.fillStyle="rgba(255,255,255,.10)";ctx.roundRect(w-pad-150,pad,150,150,24);ctx.fill();ctx.drawImage(img,w-pad-138,pad+12,126,126);ctx.restore()}catch{}};img.src=orgLogo}
      ctx.font=(mode==="story"?"800 66px":"800 48px")+" Arial";ctx.fillStyle=white
      wrap(ctx,orgName,pad,pad+(mode==="story"?170:145),w-pad*2,mode==="story"?76:56,3)
      ctx.font=(mode==="story"?"800 80px":"800 58px")+" Arial"
      wrap(ctx,campaignName,pad,mode==="story"?430:335,w-pad*2,mode==="story"?90:66,4)
      const statY=mode==="story"?920:mode==="flyer"?730:650
      ctx.fillStyle="rgba(255,255,255,.08)";ctx.roundRect(pad,statY,w-pad*2,mode==="story"?330:230,28);ctx.fill()
      ctx.font=(mode==="story"?"800 108px":"800 74px")+" Arial";ctx.fillStyle=pink;ctx.fillText(safePct.toFixed(0)+"%",pad+44,statY+(mode==="story"?120:90))
      ctx.font=(mode==="story"?"700 28px":"700 21px")+" Arial";ctx.fillStyle=white;ctx.fillText("OF FUNDRAISING GOAL",pad+44,statY+(mode==="story"?165:128))
      ctx.font=(mode==="story"?"600 26px":"600 19px")+" Arial";ctx.fillStyle=muted;ctx.fillText(raised+" raised of "+goal,pad+44,statY+(mode==="story"?215:168));ctx.fillText(daysRemaining+" days remaining",pad+44,statY+(mode==="story"?265:202))
      ctx.fillStyle="rgba(255,255,255,.16)";ctx.roundRect(pad,h-190,w-pad*2,96,18);ctx.fill()
      ctx.font=(mode==="story"?"700 28px":"700 20px")+" Arial";ctx.fillStyle=white;ctx.fillText(startLabel+" — "+endLabel,pad+28,h-130)
      ctx.fillStyle=pink;ctx.roundRect(pad,h-74,w-pad*2,10,5);ctx.fill()
    }
    render(squareCanvas.current,1080,1080,"square")
    render(storyCanvas.current,1080,1920,"story")
    render(flyerCanvas.current,1275,1650,"flyer")
  },[orgName,campaignName,safePct,raised,goal,daysRemaining,startLabel,endLabel])

  useEffect(()=>{
    const canvas=milestoneCanvas.current;if(!canvas)return
    canvas.width=1080;canvas.height=1080
    const ctx=canvas.getContext("2d");if(!ctx)return
    ctx.fillStyle="#101820";ctx.fillRect(0,0,1080,1080)
    ctx.fillStyle="#ed4f9a";ctx.fillRect(70,70,160,10)
    ctx.font="800 30px Arial";ctx.fillStyle="#f7c6dd";ctx.fillText(orgName.toUpperCase(),70,135)
    ctx.font="900 230px Arial";ctx.fillStyle="#ffffff";ctx.fillText(milestone+"%",70,520)
    ctx.font="800 52px Arial";ctx.fillStyle="#ed4f9a";ctx.fillText("GOAL MILESTONE",76,590)
    ctx.font="700 39px Arial";ctx.fillStyle="#d5dde6";wrap(ctx,campaignName,76,680,900,50,3)
    ctx.font="600 28px Arial";ctx.fillStyle="#aebdcb";ctx.fillText("Help us keep the momentum going.",76,880)
    ctx.fillStyle="#ed4f9a";ctx.roundRect(76,940,928,14,7);ctx.fill()
  },[milestone,orgName,campaignName])

  useEffect(()=>{
    const canvas=productCanvas.current;if(!canvas||!selectedProduct)return
    canvas.width=1080;canvas.height=1080
    const ctx=canvas.getContext("2d");if(!ctx)return
    ctx.fillStyle="#f5f7fa";ctx.fillRect(0,0,1080,1080)
    ctx.fillStyle="#0d2238";ctx.fillRect(0,0,1080,300)
    ctx.fillStyle="#ed4f9a";ctx.fillRect(70,70,140,9)
    ctx.font="800 26px Arial";ctx.fillStyle="#f5d0e1";ctx.fillText(orgName.toUpperCase(),70,132)
    ctx.font="800 52px Arial";ctx.fillStyle="#ffffff";wrap(ctx,"CAMPAIGN FAVORITE",70,215,900,58,2)
    ctx.fillStyle="#ffffff";ctx.roundRect(70,355,940,480,26);ctx.fill()
    ctx.font="800 54px Arial";ctx.fillStyle="#14263a";wrap(ctx,selectedProduct.title,115,470,430,64,4)
    if(selectedProduct.image){const img=new Image();img.crossOrigin="anonymous";img.onload=()=>{try{ctx.fillStyle="#ffffff";ctx.roundRect(610,395,330,330,22);ctx.fill();ctx.drawImage(img,630,415,290,290)}catch{}};img.src=selectedProduct.image}
    ctx.font="800 62px Arial";ctx.fillStyle="#ed4f9a";ctx.fillText(selectedProduct.price?("$"+selectedProduct.price.toFixed(2)):"SHOP NOW",115,690)
    ctx.font="700 27px Arial";ctx.fillStyle="#60778e";ctx.fillText(selectedProduct.qty+" sold  •  "+new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(selectedProduct.raised)+" raised",115,755)
    ctx.fillStyle="#0d68be";ctx.roundRect(70,890,940,110,20);ctx.fill()
    ctx.font="800 30px Arial";ctx.fillStyle="#ffffff";ctx.fillText("SHOP THE FUNDRAISER",115,960)
  },[selectedProduct,orgName])

  const reminderDates=useMemo(()=>{
    if(!startDate||!endDate)return []
    const mid=new Date((startDate.getTime()+endDate.getTime())/2)
    const seven=new Date(endDate.getTime()-7*86400000)
    const two=new Date(endDate.getTime()-2*86400000)
    return [
      ["Launch Day",startDate,"Post campaign link and launch graphic"],
      ["Halfway Check-In",mid,"Share progress and top-selling product"],
      ["7 Days Remaining",seven,"Switch to final-week urgency messaging"],
      ["Final 48 Hours",two,"Post final-call messaging and countdown graphic"],
    ] as [string,Date,string][]
  },[startsAt,endsAt])

  const channels=["facebook","instagram","email","qr"]
  const getTracked=(channel:string)=>tracking.find(x=>x.channel===channel)

  function doDownload(canvas:HTMLCanvasElement|null,name:string,label:string){
    downloadCanvas(canvas,name);setNotice("Downloaded");logActivity("asset_download",label)
  }

  return <>
    <div className="agency-page-head marketing-head"><div><h1>Marketing Center</h1><p>Campaign promotion, tracked links, ready-to-use graphics, messaging, and activity in one place.</p></div>{notice&&<span className="agency-action-msg">{notice}</span>}</div>

    {(finalWeek||slowing)&&<section className={"marketing-intelligence "+(final48?"urgent":"")}>
      <div><span>{final48?"FINAL 48 HOURS":finalWeek?"FINAL WEEK MODE":"SALES MOMENTUM ALERT"}</span>
        <h2>{final48?"Push the final call now.":finalWeek?"Your campaign is in its final week.":"Recent sales have slowed."}</h2>
        <p>{final48?"Use stronger urgency copy and the countdown assets below.":finalWeek?"All suggested campaign copy below has automatically switched to urgency-focused wording.":"Sales from the last 3 days are down more than 50% versus the previous 3 days. Re-share the campaign link and feature your top product."}</p>
      </div>
    </section>}

    <section className="marketing-hero-card">
      <div className="marketing-hero-copy"><span className="marketing-eyebrow">CAMPAIGN SHARE HUB</span><h2>{campaignName}</h2><p>{orgName}</p><div className="marketing-hero-meta"><span>{startLabel} — {endLabel}</span><span>{daysRemaining} days remaining</span><span>{safePct.toFixed(0)}% of goal</span></div></div>
      <div className="marketing-hero-actions"><button className="agency-primary" disabled={!url} onClick={()=>{copyText(campaignMessage,setNotice,"Share copy copied");logActivity("copy","Campaign share copy")}}>↗ Share Campaign</button><button className="agency-outline-button" disabled={!url} onClick={()=>{copyText(url,setNotice,"Campaign link copied");logActivity("copy","Direct campaign link")}}>Copy Link</button>{url&&<a className="agency-outline-button marketing-link-button" href={url} target="_blank" rel="noreferrer">Open Store ↗</a>}</div>
    </section>

    <section className="marketing-kpis">
      <div><span>FUNDRAISING PROGRESS</span><strong>{safePct.toFixed(0)}%</strong><div><i style={{width:safePct+"%"}}/></div></div>
      <div><span>RAISED</span><strong>{raised}</strong><small>of {goal}</small></div>
      <div><span>DAYS LEFT</span><strong>{daysRemaining}</strong><small>Ends {endLabel}</small></div>
      <div><span>LAST 3 DAYS</span><strong>{new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(last3Sales)}</strong><small>{slowing?"Momentum needs a push":"Current sales activity"}</small></div>
    </section>

    <section className="agency-card marketing-tracking-card">
      <header><div><h2>Tracked Campaign Links</h2><p>Create channel-specific links and see which source is actually driving campaign traffic.</p></div><span className="agency-pill active">CLICK TRACKING</span></header>
      <div className="marketing-tracking-grid">{channels.map(channel=>{const t=getTracked(channel);return <div key={channel}><span className="marketing-channel">{channel.toUpperCase()}</span><strong>{t?t.clicks:0}</strong><small>tracked clicks</small>{t?<button className="agency-outline-button" onClick={()=>copyText(t.share_url,setNotice,channel+" link copied")}>Copy Tracking Link</button>:<button className="agency-outline-button" disabled={!url||loadingChannel===channel} onClick={()=>createTracking(channel)}>{loadingChannel===channel?"Creating…":"Create Link"}</button>}</div>})}</div>
    </section>

    <section className="marketing-grid-main">
      <article className="agency-card marketing-link-card">
        <header><div><h2>Campaign Link & QR</h2><p>Use the QR tracking link when available so scans are counted.</p></div></header>
        <div className="marketing-link-field"><span>{getTracked("qr")?.share_url||url||"No storefront URL configured"}</span><button disabled={!url} onClick={()=>copyText(getTracked("qr")?.share_url||url,setNotice,"QR campaign link copied")}>Copy</button></div>
        <div className="marketing-qr-row"><div className="marketing-qr-frame">{url?<canvas ref={qrCanvas}/>:<span>No QR available</span>}</div><div><h3>Download QR Code</h3><p>Perfect for flyers, station signage, table cards and community events.</p><button className="agency-outline-button" disabled={!url} onClick={()=>doDownload(qrCanvas.current,"campaign-qr-code.png","QR code")}>↓ Download PNG</button></div></div>
      </article>

      <article className="agency-card marketing-copy-card">
        <header><div><h2>Ready-to-Send Copy</h2><p>Suggested messaging automatically adapts as the campaign approaches its end date.</p></div></header>
        <div className="marketing-copy-tabs">{(["short","social","email"] as const).map(t=><button className={copyTone===t?"active":""} key={t} onClick={()=>setCopyTone(t)}>{t==="short"?"Quick Post":t==="social"?"Social Post":"Email"}</button>)}</div>
        <textarea readOnly value={copies[copyTone]}/>
        <div className="marketing-copy-actions"><button className="agency-primary" onClick={()=>{copyText(copies[copyTone],setNotice,"Copy ready");logActivity("copy",copyTone+" campaign copy")}}>Copy {copyTone==="email"?"Email":"Post"}</button></div>
      </article>
    </section>

    <section className="agency-card marketing-assets-card">
      <header><div><h2>Campaign Graphics</h2><p>Downloadable assets built from your real campaign name, dates, goal and progress.</p></div><span className="agency-pill active">PNG</span></header>
      <div className="marketing-assets-grid">
        <div className="marketing-asset"><div className="marketing-asset-preview square"><canvas ref={squareCanvas}/></div><div><strong>Social Square</strong><span>1080 × 1080</span></div><button className="agency-outline-button" onClick={()=>doDownload(squareCanvas.current,"campaign-social-square.png","Social square")}>↓ Download</button></div>
        <div className="marketing-asset"><div className="marketing-asset-preview story"><canvas ref={storyCanvas}/></div><div><strong>Story Graphic</strong><span>1080 × 1920</span></div><button className="agency-outline-button" onClick={()=>doDownload(storyCanvas.current,"campaign-story.png","Story graphic")}>↓ Download</button></div>
        <div className="marketing-asset"><div className="marketing-asset-preview flyer"><canvas ref={flyerCanvas}/></div><div><strong>Campaign Flyer</strong><span>Print-friendly</span></div><button className="agency-outline-button" onClick={()=>doDownload(flyerCanvas.current,"campaign-flyer.png","Campaign flyer")}>↓ Download</button></div>
      </div>
    </section>

    <section className="marketing-grid-main">
      <article className="agency-card marketing-milestone-card">
        <header><div><h2>Milestone Graphics</h2><p>Celebrate progress at 25%, 50%, 75%, and 100%.</p></div></header>
        <div className="marketing-milestone-buttons">{[25,50,75,100].map(m=><button className={milestone===m?"active":""} key={m} onClick={()=>setMilestone(m)}>{m}%</button>)}</div>
        <div className="marketing-asset-preview square compact"><canvas ref={milestoneCanvas}/></div>
        <button className="agency-outline-button marketing-download-wide" onClick={()=>doDownload(milestoneCanvas.current,"campaign-"+milestone+"-milestone.png",milestone+"% milestone graphic")}>↓ Download {milestone}% Graphic</button>
      </article>

      <article className="agency-card marketing-product-card">
        <header><div><h2>Product Promo Generator</h2><p>Turn actual campaign products into shareable promotional graphics.</p></div></header>
        <select value={selectedProduct?.id||""} onChange={e=>setProductId(e.target.value)}>{products.map(p=><option value={p.id} key={p.id}>{p.title}</option>)}</select>
        {selectedProduct?<><div className="marketing-asset-preview square compact"><canvas ref={productCanvas}/></div><button className="agency-outline-button marketing-download-wide" onClick={()=>doDownload(productCanvas.current,"product-promo.png","Product promo: "+selectedProduct.title)}>↓ Download Product Graphic</button></>:<div className="agency-empty">No campaign products available yet.</div>}
      </article>
    </section>

    <section className="marketing-grid-secondary">
      <article className="agency-card">
        <header><div><h2>Promotion Reminder Schedule</h2><p>Campaign dates automatically generate the recommended marketing cadence.</p></div></header>
        <div className="marketing-reminders">{reminderDates.length?reminderDates.map(([name,date,desc])=>{const now=Date.now();const due=date.getTime()<=now;return <div key={name} className={due?"due":""}><span>{dayLabel(date)}</span><div><strong>{name}</strong><small>{desc}</small></div><b>{due?"DUE / PASSED":"UPCOMING"}</b></div>}):<div className="agency-empty">Add campaign start and end dates to generate reminders.</div>}</div>
      </article>

      <article className="agency-card">
        <header><div><h2>Saved Copy Templates</h2><p>Save custom department messaging and reuse it later.</p></div></header>
        <div className="marketing-template-editor"><input placeholder="Template name" value={templateName} onChange={e=>setTemplateName(e.target.value)}/><textarea placeholder="Write or paste custom campaign copy…" value={customCopy} onChange={e=>setCustomCopy(e.target.value)}/><button className="agency-primary" onClick={saveTemplate}>Save Template</button></div>
        <div className="marketing-template-list">{templates.map(t=><div key={t.id}><div><strong>{t.name}</strong><small>{t.kind}</small></div><button onClick={()=>{setCustomCopy(t.content);setTemplateName(t.name)}}>Use</button><button onClick={()=>deleteTemplate(t.id)}>Delete</button></div>)}{!templates.length&&<div className="agency-empty">No saved templates yet.</div>}</div>
      </article>
    </section>

    <section className="marketing-grid-secondary">
      <article className="agency-card">
        <header><div><h2>Recent Marketing Activity</h2><p>See what your department has copied, downloaded, or created.</p></div></header>
        <div className="marketing-activity-list">{activity.map(a=><div key={a.id}><span>•</span><div><strong>{a.label||a.action}</strong><small>{new Date(a.created_at).toLocaleString()}</small></div></div>)}{!activity.length&&<div className="agency-empty">No marketing activity recorded yet.</div>}</div>
      </article>

      <article className="agency-card marketing-check-card">
        <header><div><h2>Campaign Readiness</h2><p>Quick check before promoting.</p></div></header>
        <div className="marketing-checklist">
          <div className={url?"done":""}><span>{url?"✓":"!"}</span><div><strong>Storefront Link</strong><small>{url?"Connected and ready":"Needs a public store URL"}</small></div></div>
          <div className={startsAt&&endsAt?"done":""}><span>{startsAt&&endsAt?"✓":"!"}</span><div><strong>Campaign Dates</strong><small>{startsAt&&endsAt?startLabel+" — "+endLabel:"Start and end dates needed"}</small></div></div>
          <div className={safePct>=0?"done":""}><span>✓</span><div><strong>Live Progress</strong><small>{safePct.toFixed(0)}% of goal</small></div></div>
          <div className={products.length?"done":""}><span>{products.length?"✓":"!"}</span><div><strong>Campaign Products</strong><small>{products.length?products.length+" products available":"No products linked yet"}</small></div></div>
        </div>
      </article>
    </section>
  </>
}
