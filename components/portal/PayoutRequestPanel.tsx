"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

function money(v:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(v||0)}

export default function PayoutRequestPanel({organizationId,campaignId,available,threshold,canRequest,openRequest}:{organizationId:string;campaignId:string;available:number;threshold:number;canRequest:boolean;openRequest:any}){
  const [note,setNote]=useState("")
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState("")
  const router=useRouter()
  const below=available<threshold

  async function requestPayout(){
    setBusy(true);setMsg("")
    try{
      const res=await fetch("/api/portal/payout-requests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({organizationId,campaignId,note})})
      const data=await res.json()
      if(!res.ok) throw new Error(data.error||"Unable to request payout")
      setMsg("Payout request submitted.")
      setNote("")
      router.refresh()
    }catch(e:any){setMsg(e.message||"Unable to request payout")}
    finally{setBusy(false)}
  }

  return <section className="agency-card">
    <header><div><h2>Request a Payout</h2><p>Submit currently unpaid campaign proceeds for platform review.</p></div></header>
    <div className="agency-payout-request">
      <div className="agency-request-amount"><span>Currently eligible to request</span><strong>{money(available)}</strong><small>Minimum request threshold: {money(threshold)}</small></div>

      {openRequest?(
        <div className="agency-request-status">
          <span className={"agency-pill "+openRequest.status}>{openRequest.status}</span>
          <div><strong>{money(Number(openRequest.requested_amount||0))} requested</strong><small>Submitted {new Date(openRequest.requested_at).toLocaleString()}</small></div>
          <p>{openRequest.status==="requested"?"Your request is waiting for platform review.":openRequest.status==="approved"?"Approved and queued for payment.":openRequest.status==="processing"?"Payment is being processed.":"Request status: "+openRequest.status}</p>
        </div>
      ):(
        <>
          <label className="agency-request-note">Optional note<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={1000} placeholder="Anything the payout reviewer should know?"/></label>
          {!canRequest&&<div className="agency-request-warning">Only organization Owners and Admins can submit payout requests.</div>}
          {below&&available>0&&<div className="agency-request-warning">The available amount is below this campaign&apos;s {money(threshold)} payout threshold.</div>}
          {available<=0&&<div className="agency-request-warning">There are no unpaid campaign proceeds available right now.</div>}
          <button className="agency-primary agency-request-button" disabled={!canRequest||below||available<=0||busy} onClick={requestPayout}>{busy?"Submitting…":"Request "+money(available)+" Payout"}</button>
        </>
      )}
      {msg&&<div className="agency-request-message">{msg}</div>}
    </div>
  </section>
}