"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function PayoutRequestActions({requestId,status}:{requestId:string;status:string}){
  const [busy,setBusy]=useState("")
  const [msg,setMsg]=useState("")
  const router=useRouter()

  async function act(action:string){
    let adminNote:string|undefined
    let paymentReference:string|undefined
    if(action==="reject") adminNote=window.prompt("Reason for rejection?")||undefined
    if(action==="paid") paymentReference=window.prompt("Payment reference / ACH trace (optional)")||undefined
    setBusy(action);setMsg("")
    try{
      const res=await fetch("/api/admin/payout-requests",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestId,action,adminNote,paymentReference})})
      const data=await res.json()
      if(!res.ok) throw new Error(data.error||"Unable to update request")
      router.refresh()
    }catch(e:any){setMsg(e.message||"Unable to update request")}
    finally{setBusy("")}
  }

  return <div className="fc-inline-actions">
    {status==="requested"&&<><button className="fc-btn fc-btn-primary" disabled={!!busy} onClick={()=>act("approve")}>{busy==="approve"?"Approving…":"Approve"}</button><button className="fc-btn" disabled={!!busy} onClick={()=>act("reject")}>Reject</button></>}
    {status==="approved"&&<button className="fc-btn fc-btn-primary" disabled={!!busy} onClick={()=>act("processing")}>{busy==="processing"?"Updating…":"Mark Processing"}</button>}
    {status==="processing"&&<button className="fc-btn fc-btn-primary" disabled={!!busy} onClick={()=>act("paid")}>{busy==="paid"?"Updating…":"Mark Paid"}</button>}
    {msg&&<small className="fc-admin-message">{msg}</small>}
  </div>
}