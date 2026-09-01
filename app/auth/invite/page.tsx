"use client"

import { FormEvent,useEffect,useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function InvitePage(){
  const router=useRouter()
  const [password,setPassword]=useState("")
  const [confirm,setConfirm]=useState("")
  const [email,setEmail]=useState("")
  const [ready,setReady]=useState(false)
  const [msg,setMsg]=useState("")
  const [busy,setBusy]=useState(false)

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search)
    const queryError=params.get("error")
    if(queryError) setMsg(queryError)
    const supabase=createClient()
    supabase.auth.getUser().then(({data,error})=>{
      if(error||!data.user){setMsg(m=>m||"This invitation is invalid or has expired. Ask your department administrator to resend it.");setReady(true);return}
      setEmail(data.user.email||"")
      setReady(true)
    })
  },[])

  async function submit(e:FormEvent){
    e.preventDefault();setMsg("")
    if(password.length<8){setMsg("Password must be at least 8 characters.");return}
    if(password!==confirm){setMsg("Passwords do not match.");return}
    setBusy(true)
    const supabase=createClient()
    const {error}=await supabase.auth.updateUser({password})
    setBusy(false)
    if(error){setMsg(error.message);return}
    router.push("/home")
    router.refresh()
  }

  return <main className="auth-page invite-page">
    <div className="auth-card invite-card">
      <div className="eyebrow">FUNDRAISER COMMAND</div>
      <h1>Finish setting up your account</h1>
      <p>You&apos;ve been invited to access a department workspace. Create your password to continue.</p>
      {!ready?<div className="auth-loading">Checking invitation…</div>:email?(
        <form onSubmit={submit}>
          <label>Email</label><input value={email} disabled/>
          <label>Create password</label><input type="password" required autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/>
          <label>Confirm password</label><input type="password" required autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/>
          {msg&&<div className="error">{msg}</div>}
          <button type="submit" disabled={busy}>{busy?"Saving…":"Activate My Account"}</button>
        </form>
      ):<><div className="error">{msg}</div><p className="auth-footer">Your department administrator can resend a fresh invitation from Member Access.</p></>}
    </div>
  </main>
}
