'use client'
import {useEffect,useState} from 'react'
import InstallGuide from '@/components/portal/InstallGuide'
import {useDialogAccessibility} from '@/components/public/useDialogAccessibility'
export default function DesignerOnboarding({organizationId}:{organizationId:string}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const ref=useDialogAccessibility<HTMLElement>(open,()=>setOpen(false))
 useEffect(()=>{let live=true;fetch('/api/portal/preferences?organizationId='+encodeURIComponent(organizationId)).then(async r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{if(live&&Number(d.preferences?.onboarding_version||0)<3)setOpen(true)}).catch(()=>{});return()=>{live=false}},[organizationId])
 async function finish(){setBusy(true);try{const r=await fetch('/api/portal/preferences',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({organizationId,designerOnboardingCompleted:true})});if(!r.ok)throw Error();setOpen(false);document.getElementById('notifications')?.scrollIntoView({behavior:'smooth'})}catch{setError('Could not save your progress. Please try again.')}finally{setBusy(false)}}
 if(!open)return null
 return <div className="fc-tour-overlay"><section className="fc-guided-tour" role="dialog" aria-modal="true" aria-labelledby="designer-install-title" ref={ref}><h2 id="designer-install-title">Your designer app is ready</h2><p>Keep your sales and commissions close. Add the app to your Home Screen, then enable alerts for new sales and payout updates.</p><InstallGuide/><p>After installation, open the app and choose “Enable on this device” in Notifications. Allow notifications when your device asks.</p><div className="fc-tour-actions"><button type="button" className="fc-tour-primary" disabled={busy} onClick={finish}>{busy?'Saving…':'Continue to notifications'}</button><button type="button" disabled={busy} onClick={()=>setOpen(false)}>Remind me next time</button></div>{error&&<p role="alert">{error}</p>}</section></div>
}
