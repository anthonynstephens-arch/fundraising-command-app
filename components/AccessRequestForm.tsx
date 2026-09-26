'use client'
import { LegalNotice } from "@/components/legal/LegalLinks"
import { FormEvent, useEffect, useState } from 'react'
export default function AccessRequestForm({organizationSlug}:{organizationSlug:string}) {
 const [enabled,setEnabled]=useState(false)
 useEffect(()=>{fetch('/api/access-requests?slug='+encodeURIComponent(organizationSlug)).then(r=>r.json()).then(d=>setEnabled(!!d.enabled)).catch(()=>setEnabled(false))},[organizationSlug])
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[message,setMessage]=useState('')
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage('')
  const form=new FormData(e.currentTarget)
  try {
   const response=await fetch('/api/access-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({organizationSlug,name:form.get('name'),email:form.get('email'),pin:form.get('pin'),website:form.get('website')})})
   const data=await response.json()
   if(!response.ok)throw new Error(data.error||'Unable to submit your request.')
   setDone(true);setMessage('Request received. Your PIN will work after an administrator approves your access. We’ll email you when it is ready.')
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to connect. Please try again.')}finally{setBusy(false)}
 }
 if(!enabled)return null
 return <div className="plymouth-request">
  <button type="button" className="plymouth-request-toggle" aria-expanded={open} aria-controls="plymouth-request-form" onClick={()=>setOpen(!open)}>{open?'Back to sign in':'Request access'}</button>
  {open&&<div id="plymouth-request-form"><h3>Request department access</h3>{!done&&<form onSubmit={submit}>
   <label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={100}/></label>
   <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
   <label>Choose a PIN<input name="pin" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{4,8}" minLength={4} maxLength={8} required/></label>
   <small>Use 4–8 digits. Keep your PIN private.</small>
   <label className="access-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
   <LegalNotice action="submitting an access request"/><button className="primary" disabled={busy}>{busy?'Submitting…':'Submit request'}</button>
  </form>}<p role="status">{message}</p></div>}
 </div>
}
