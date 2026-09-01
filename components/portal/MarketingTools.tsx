"use client"
import { useEffect,useRef,useState } from "react"
import QRCode from "qrcode"

function copy(text:string,setMsg:(s:string)=>void){navigator.clipboard.writeText(text).then(()=>setMsg("Copied")).catch(()=>setMsg("Copy failed"))}

export default function MarketingTools({url,orgName,campaignName,daysRemaining,pct,raised,goal}:{url:string;orgName:string;campaignName:string;daysRemaining:number;pct:number;raised:string;goal:string}){
  const canvas=useRef<HTMLCanvasElement>(null);const [msg,setMsg]=useState("")
  useEffect(()=>{if(canvas.current&&url)QRCode.toCanvas(canvas.current,url,{width:180,margin:1})},[url])
  function downloadQr(){if(!canvas.current)return;const a=document.createElement("a");a.href=canvas.current.toDataURL("image/png");a.download="campaign-qr.png";a.click()}
  const social="🚀 Support "+orgName+"! Our "+campaignName+" fundraiser is live. Shop now: "+url
  const email="Hi friends,\n\n"+orgName+" is running the "+campaignName+" fundraiser. A portion of every eligible sale supports our department. We are currently at "+pct.toFixed(1)+"% of our "+goal+" goal.\n\nShop here: "+url
  return <>
    <div className="agency-page-head"><div><h1>Marketing Tools</h1><p>Ready-to-use tools to share your campaign</p></div>{msg&&<span className="agency-action-msg">{msg}</span>}</div>
    <section className="agency-grid-2">
      <article className="agency-card"><header><div><h2>Public Storefront Link</h2><p>Share your campaign collection page</p></div></header><div className="agency-copybox"><span>{url||"Campaign storefront not set"}</span><button disabled={!url} onClick={()=>copy(url,setMsg)}>Copy Link</button></div><div className="agency-info">This links directly to the live campaign storefront.</div></article>
      <article className="agency-card"><header><div><h2>QR Code</h2><p>Download for flyers & signage</p></div></header><div className="agency-qr-real">{url?<canvas ref={canvas}/>:<span>No storefront URL</span>}</div><button className="agency-primary" disabled={!url} onClick={downloadQr}>↓ Download QR</button></article>
    </section>
    <section className="agency-grid-2">
      <article className="agency-card"><header><div><h2>Campaign Countdown Graphic</h2><p>Days remaining</p></div></header><div className="agency-social-card dark"><span>◷</span><strong>{daysRemaining}</strong><b>DAYS LEFT</b><small>{campaignName}</small></div></article>
      <article className="agency-card"><header><div><h2>Fundraising Progress Graphic</h2><p>Share your momentum</p></div></header><div className="agency-social-card bluebg"><span>◎</span><strong>{pct.toFixed(1)}%</strong><b>OF GOAL REACHED</b><small>{raised} of {goal}</small></div></article>
    </section>
    <section className="agency-grid-2">
      <article className="agency-card"><header><div><h2>Suggested Social Post</h2><p>Copy and paste to your channels</p></div><button className="agency-text-action" onClick={()=>copy(social,setMsg)}>Copy</button></header><div className="agency-copytext">{social}</div></article>
      <article className="agency-card"><header><div><h2>Suggested Email Copy</h2><p>Ready-to-send outreach template</p></div><button className="agency-text-action" onClick={()=>copy(email,setMsg)}>Copy</button></header><div className="agency-copytext">{email.split("\n").map((x,i)=><div key={i}>{x||<br/>}</div>)}</div></article>
    </section>
  </>
}