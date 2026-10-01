'use client'
import {useEffect,useState} from 'react'
import {usePathname,useRouter} from 'next/navigation'

// Recheck existing tabs as well as fresh navigation; do not render cached sales while checking.
export default function DepartmentPortalGate({organizationId,children}:{organizationId:string;children:React.ReactNode}){
 const router=useRouter(),path=usePathname()
 const [state,setState]=useState<{org:string;path:string;status:'checking'|'open'|'locked'|'error'}>({org:organizationId,path,status:'checking'})
 const [retry,setRetry]=useState(0)
 useEffect(()=>{
  if(!organizationId)return
  let active=true,inFlight=false
  const controller=new AbortController()
  setState({org:organizationId,path,status:'checking'})
  async function check(){
   if(inFlight)return
   inFlight=true
   try{
    const r=await fetch('/api/organizations/details?accessOnly=1&organizationId='+encodeURIComponent(organizationId),{cache:'no-store',signal:controller.signal})
    const data=await r.json()
    if(!r.ok||typeof data.locked!=='boolean')throw Error('Unable to verify department access.')
    if(!active)return
    setState({org:organizationId,path,status:data.locked?'locked':'open'})
    if(data.locked)router.replace('/department-details?org='+encodeURIComponent(organizationId))
   }catch{if(active)setState({org:organizationId,path,status:'error'})}finally{inFlight=false}
  }
  void check()
  const interval=window.setInterval(()=>{void check()},10000)
  const focus=()=>{void check()}
  const visibility=()=>{if(document.visibilityState==='visible')void check()}
  window.addEventListener('focus',focus);document.addEventListener('visibilitychange',visibility)
  return()=>{active=false;controller.abort();window.clearInterval(interval);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visibility)}
 },[organizationId,path,router,retry])
 if(!organizationId)return <>{children}</>
 const status=state.org===organizationId&&state.path===path?state.status:'checking'
 if(status==='open')return <>{children}</>
 return <main style={{maxWidth:800,margin:'40px auto',padding:24}}><section className="agency-card pe-card" role="status">
 <h1>{status==='locked'?'Department details required':status==='error'?'Unable to verify department access':'Checking department access…'}</h1>
 {status==='locked'?<><p>Complete your payment details and contacts. Sales, orders, reports and payouts remain locked until Detroit Decal &amp; Apparel accepts your submission.</p><a className="pe-button" href={'/department-details?org='+encodeURIComponent(organizationId)}>Complete required details</a></>:status==='error'?<><p>Please reconnect and try again to open the department portal.</p><button className="pe-button" onClick={()=>setRetry(v=>v+1)}>Try again</button></>:<p>Please wait while we check your department’s requirements.</p>}
 </section></main>
}
