"use client"

import { useEffect,useMemo,useRef,useState } from "react"
import QRCode from "qrcode"

function moneyText(v:string){return v||"$0"}
function copy(text:string,setNotice:(s:string)=>void,label="Copied"){
  navigator.clipboard.writeText(text).then(()=>{setNotice(label);setTimeout(()=>setNotice(""),1800)}).catch(()=>setNotice("Copy failed"))
}
function downloadCanvas(canvas:HTMLCanvasElement|null,name:string){
  if(!canvas)return
  const a=document.createElement("a")
  a.href=canvas.toDataURL("image/png")
  a.download=name
  a.click()
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

export default function MarketingTools({
  url,orgName,campaignName,daysRemaining,pct,raised,goal,startsAt,endsAt
}:{
  url:string;orgName:string;campaignName:string;daysRemaining:number;pct:number;raised:string;goal:string;startsAt?:string|null;endsAt?:string|null
}){
  const [notice,setNotice]=useState("")
  const [copyTone,setCopyTone]=useState<"short"|"social"|"email">("social")
  const qrCanvas=useRef<HTMLCanvasElement>(null)
  const squareCanvas=useRef<HTMLCanvasElement>(null)
  const storyCanvas=useRef<HTMLCanvasElement>(null)
  const flyerCanvas=useRef<HTMLCanvasElement>(null)

  const startLabel=startsAt?new Date(startsAt).toLocaleDateString("en-US",{month:"short",day:"numeric"}):"TBD"
  const endLabel=endsAt?new Date(endsAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"TBD"
  const safePct=Math.max(0,Math.min(100,pct||0))

  const copies=useMemo(()=>({
    short:"Support "+orgName+"'s "+campaignName+" fundraiser. Shop here: "+url,
    social:"Help us make an impact. "+orgName+"'s "+campaignName+" fundraiser is live now. We are "+safePct.toFixed(0)+"% of the way to our "+goal+" goal with "+daysRemaining+" days remaining. Every eligible purchase helps support the campaign. Shop here: "+url,
    email:"Subject: Support "+orgName+" — "+campaignName+"\n\nHi,\n\nOur "+campaignName+" fundraiser is officially live. We are currently at "+safePct.toFixed(0)+"% of our "+goal+" fundraising goal, with "+daysRemaining+" days remaining.\n\nYour support through an eligible campaign purchase helps us move closer to that goal.\n\nShop the campaign: "+url+"\n\nThank you for supporting "+orgName+"."
  }),[orgName,campaignName,url,safePct,goal,daysRemaining])

  useEffect(()=>{
    if(qrCanvas.current&&url)QRCode.toCanvas(qrCanvas.current,url,{width:220,margin:1,color:{dark:"#0b1f33",light:"#ffffff"}})
  },[url])

  useEffect(()=>{
    const render=(canvas:HTMLCanvasElement|null,w:number,h:number,mode:"square"|"story"|"flyer")=>{
      if(!canvas)return
      canvas.width=w;canvas.height=h
      const ctx=canvas.getContext("2d");if(!ctx)return
      const dark="#101820",pink="#ed4f9a",soft="#f8d7e7",white="#ffffff",muted="#c9d1da"
      ctx.fillStyle=dark;ctx.fillRect(0,0,w,h)
      const grad=ctx.createLinearGradient(0,0,w,h);grad.addColorStop(0,"rgba(237,79,154,.30)");grad.addColorStop(.42,"rgba(237,79,154,.04)");grad.addColorStop(1,"rgba(255,255,255,0)")
      ctx.fillStyle=grad;ctx.fillRect(0,0,w,h)
      const pad=mode==="story"?90:mode==="flyer"?74:64
      ctx.fillStyle=pink;ctx.fillRect(pad,pad,150,10)
      ctx.font=(mode==="story"?"700 34px":"700 25px")+" Arial";ctx.fillStyle=soft;ctx.fillText("FUNDRAISER COMMAND",pad,pad+60)
      ctx.font=(mode==="story"?"700 62px":"700 42px")+" Arial";ctx.fillStyle=white
      wrap(ctx,orgName,pad,pad+(mode==="story"?170:140),w-pad*2,mode==="story"?72:50,3)
      const campaignY=mode==="story"?420:300
      ctx.font=(mode==="story"?"800 78px":"800 56px")+" Arial";ctx.fillStyle=white
      wrap(ctx,campaignName,pad,campaignY,w-pad*2,mode==="story"?88:64,4)

      const statY=mode==="story"?900:mode==="flyer"?620:650
      ctx.fillStyle="rgba(255,255,255,.08)";ctx.roundRect(pad,statY,w-pad*2,mode==="story"?330:230,28);ctx.fill()
      ctx.font=(mode==="story"?"800 108px":"800 74px")+" Arial";ctx.fillStyle=pink;ctx.fillText(safePct.toFixed(0)+"%",pad+44,statY+(mode==="story"?120:90))
      ctx.font=(mode==="story"?"700 28px":"700 21px")+" Arial";ctx.fillStyle=white;ctx.fillText("OF FUNDRAISING GOAL",pad+44,statY+(mode==="story"?165:128))
      ctx.font=(mode==="story"?"600 26px":"600 19px")+" Arial";ctx.fillStyle=muted;ctx.fillText(raised+" raised of "+goal,pad+44,statY+(mode==="story"?215:168))
      ctx.fillText(daysRemaining+" days remaining",pad+44,statY+(mode==="story"?265:202))

      ctx.fillStyle="rgba(255,255,255,.16)";ctx.roundRect(pad,h-190,w-pad*2,96,18);ctx.fill()
      ctx.font=(mode==="story"?"700 28px":"700 20px")+" Arial";ctx.fillStyle=white
      ctx.fillText(startLabel+" — "+endLabel,pad+28,h-130)
      ctx.fillStyle=pink;ctx.roundRect(pad,h-74,w-pad*2,10,5);ctx.fill()
    }
    render(squareCanvas.current,1080,1080,"square")
    render(storyCanvas.current,1080,1920,"story")
    render(flyerCanvas.current,1275,1650,"flyer")
  },[orgName,campaignName,safePct,raised,goal,daysRemaining,startLabel,endLabel])

  async function share(){
    const text=copies.social
    if(navigator.share){
      try{await navigator.share({title:campaignName,text,url});return}catch{}
    }
    copy(text,setNotice,"Share copy copied")
  }

  return <>
    <div className="agency-page-head marketing-head">
      <div><h1>Marketing Center</h1><p>Everything your department needs to promote this campaign professionally.</p></div>
      {notice&&<span className="agency-action-msg">{notice}</span>}
    </div>

    <section className="marketing-hero-card">
      <div className="marketing-hero-copy">
        <span className="marketing-eyebrow">CAMPAIGN SHARE HUB</span>
        <h2>{campaignName}</h2>
        <p>{orgName}</p>
        <div className="marketing-hero-meta">
          <span>{startLabel} — {endLabel}</span>
          <span>{daysRemaining} days remaining</span>
          <span>{safePct.toFixed(0)}% of goal</span>
        </div>
      </div>
      <div className="marketing-hero-actions">
        <button className="agency-primary" disabled={!url} onClick={share}>↗ Share Campaign</button>
        <button className="agency-outline-button" disabled={!url} onClick={()=>copy(url,setNotice,"Campaign link copied")}>Copy Link</button>
        {url&&<a className="agency-outline-button marketing-link-button" href={url} target="_blank" rel="noreferrer">Open Store ↗</a>}
      </div>
    </section>

    <section className="marketing-kpis">
      <div><span>FUNDRAISING PROGRESS</span><strong>{safePct.toFixed(0)}%</strong><div><i style={{width:safePct+"%"}}/></div></div>
      <div><span>RAISED</span><strong>{moneyText(raised)}</strong><small>of {goal}</small></div>
      <div><span>DAYS LEFT</span><strong>{daysRemaining}</strong><small>Campaign ends {endLabel}</small></div>
      <div><span>CAMPAIGN LINK</span><strong className="marketing-status">{url?"Ready to share":"Not configured"}</strong><small>{url?"Storefront connected":"Add a storefront URL"}</small></div>
    </section>

    <section className="marketing-grid-main">
      <article className="agency-card marketing-link-card">
        <header><div><h2>Campaign Link & QR</h2><p>One destination for every post, flyer, email and sign.</p></div><span className={"agency-pill "+(url?"active":"")}>{url?"LIVE":"SETUP NEEDED"}</span></header>
        <div className="marketing-link-field"><span>{url||"No storefront URL configured"}</span><button disabled={!url} onClick={()=>copy(url,setNotice,"Campaign link copied")}>Copy</button></div>
        <div className="marketing-qr-row">
          <div className="marketing-qr-frame">{url?<canvas ref={qrCanvas}/>:<span>No QR available</span>}</div>
          <div><h3>Download QR Code</h3><p>Use this on station flyers, social graphics, table signs, handouts, and printed materials.</p><button className="agency-outline-button" disabled={!url} onClick={()=>downloadCanvas(qrCanvas.current,"campaign-qr-code.png")}>↓ Download PNG</button></div>
        </div>
      </article>

      <article className="agency-card marketing-copy-card">
        <header><div><h2>Ready-to-Send Copy</h2><p>Choose a format, then copy it to your channel.</p></div></header>
        <div className="marketing-copy-tabs">
          {(["short","social","email"] as const).map(t=><button className={copyTone===t?"active":""} key={t} onClick={()=>setCopyTone(t)}>{t==="short"?"Quick Post":t==="social"?"Social Post":"Email"}</button>)}
        </div>
        <textarea readOnly value={copies[copyTone]}/>
        <div className="marketing-copy-actions"><button className="agency-primary" onClick={()=>copy(copies[copyTone],setNotice,"Copy ready")}>Copy {copyTone==="email"?"Email":"Post"}</button></div>
      </article>
    </section>

    <section className="agency-card marketing-assets-card">
      <header><div><h2>Campaign Graphics</h2><p>Prebuilt branded graphics using your campaign dates and live progress.</p></div><span className="agency-pill active">PNG</span></header>
      <div className="marketing-assets-grid">
        <div className="marketing-asset">
          <div className="marketing-asset-preview square"><canvas ref={squareCanvas}/></div>
          <div><strong>Social Square</strong><span>1080 × 1080 · Facebook / Instagram</span></div>
          <button className="agency-outline-button" onClick={()=>downloadCanvas(squareCanvas.current,"campaign-social-square.png")}>↓ Download</button>
        </div>
        <div className="marketing-asset">
          <div className="marketing-asset-preview story"><canvas ref={storyCanvas}/></div>
          <div><strong>Story Graphic</strong><span>1080 × 1920 · Instagram / Facebook Stories</span></div>
          <button className="agency-outline-button" onClick={()=>downloadCanvas(storyCanvas.current,"campaign-story.png")}>↓ Download</button>
        </div>
        <div className="marketing-asset">
          <div className="marketing-asset-preview flyer"><canvas ref={flyerCanvas}/></div>
          <div><strong>Campaign Flyer</strong><span>Print-friendly promotional graphic</span></div>
          <button className="agency-outline-button" onClick={()=>downloadCanvas(flyerCanvas.current,"campaign-flyer.png")}>↓ Download</button>
        </div>
      </div>
    </section>

    <section className="marketing-grid-secondary">
      <article className="agency-card marketing-tip-card">
        <header><div><h2>Suggested Promotion Plan</h2><p>A simple cadence your department can actually follow.</p></div></header>
        <div className="marketing-plan">
          <div><b>1</b><div><strong>Launch Day</strong><span>Post the campaign link + square graphic to every department channel.</span></div></div>
          <div><b>2</b><div><strong>Mid-Campaign</strong><span>Share current goal progress and highlight the top-selling product.</span></div></div>
          <div><b>3</b><div><strong>7 Days Remaining</strong><span>Use the countdown graphic and a stronger final-week call to action.</span></div></div>
          <div><b>4</b><div><strong>Final 48 Hours</strong><span>Post the link again and clearly state the campaign end date.</span></div></div>
        </div>
      </article>

      <article className="agency-card marketing-check-card">
        <header><div><h2>Campaign Readiness</h2><p>Quick check before you start promoting.</p></div></header>
        <div className="marketing-checklist">
          <div className={url?"done":""}><span>{url?"✓":"!"}</span><div><strong>Storefront Link</strong><small>{url?"Connected and ready":"Needs a public store URL"}</small></div></div>
          <div className={startsAt&&endsAt?"done":""}><span>{startsAt&&endsAt?"✓":"!"}</span><div><strong>Campaign Dates</strong><small>{startsAt&&endsAt?startLabel+" — "+endLabel:"Start and end dates needed"}</small></div></div>
          <div className={Number(goal.replace(/[^0-9.]/g,""))>0?"done":""}><span>{Number(goal.replace(/[^0-9.]/g,""))>0?"✓":"!"}</span><div><strong>Fundraising Goal</strong><small>{goal} target</small></div></div>
          <div className="done"><span>✓</span><div><strong>Marketing Assets</strong><small>Graphics and campaign copy are ready</small></div></div>
        </div>
      </article>
    </section>
  </>
}
