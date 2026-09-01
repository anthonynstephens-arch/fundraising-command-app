"use client"
import {FormEvent,useState} from "react"
export default function ApplicationForm(){
 const [loading,setLoading]=useState(false),[msg,setMsg]=useState("")
 async function submit(e:FormEvent<HTMLFormElement>){
   e.preventDefault(); setLoading(true); setMsg("")
   const form=e.currentTarget
   const payload=Object.fromEntries(new FormData(form).entries())
   try{
     const r=await fetch("/api/public/apply",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)})
     const t=await r.text(); let j:any={}; try{j=JSON.parse(t)}catch{}
     if(!r.ok) throw new Error(j.error||t||"Unable to submit application.")
     form.reset(); setMsg("✓ Application received. We’ll follow up with you.")
   }catch(err:any){setMsg(err?.message||"Something went wrong.")}finally{setLoading(false)}
 }
 return <form onSubmit={submit} className="pub-form"><div className="pub-form-grid">
   <label>Organization name<input name="organization_name" required /></label>
   <label>Organization type<select name="organization_type" required defaultValue=""><option value="" disabled>Select type</option><option value="fire">Fire Department</option><option value="police">Police Department</option><option value="ems">EMS</option><option value="school">School</option><option value="nonprofit">Nonprofit</option><option value="business">Business / Organization</option><option value="other">Other</option></select></label>
   <label>Your name<input name="contact_name" required /></label>
   <label>Email<input name="contact_email" type="email" required /></label>
   <label>Phone<input name="contact_phone" type="tel" /></label>
   <label>Fundraiser type<select name="requested_campaign_type" defaultValue="fundraiser"><option value="fundraiser">General Fundraiser</option><option value="breast-cancer-awareness">Breast Cancer Awareness</option><option value="movember">Movember</option><option value="autism-awareness">Autism Awareness</option><option value="department-store">Department Store</option><option value="school">School Fundraiser</option><option value="other">Other</option></select></label>
 </div><label>Tell us what you want to build<textarea name="message" rows={5}/></label><button className="pub-primary" disabled={loading}>{loading?"Submitting…":"Submit Application"}</button>{msg&&<div className="pub-msg">{msg}</div>}</form>
}