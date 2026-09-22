'use client'
import {useEffect,useState} from 'react'
import InstallGuide from './InstallGuide'
type Preferences={email_enabled:boolean;browser_enabled:boolean;in_app_enabled:boolean;new_sales:boolean;payout_updates:boolean;campaign_milestones:boolean;sync_issues:boolean}
const defaults:Preferences={email_enabled:true,browser_enabled:false,in_app_enabled:true,new_sales:true,payout_updates:true,campaign_milestones:true,sync_issues:true}
export default function PortalNotificationSettings({organizationId,userEmail}:{organizationId:string;userEmail:string}){
 const [email,setEmail]=useState(''),[canEditEmail,setCanEditEmail]=useState(false),[emailReady,setEmailReady]=useState(false)
 const [preferences,setPreferences]=useState(defaults),[loaded,setLoaded]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[enabled,setEnabled]=useState(false),[supported,setSupported]=useState(false),[iphoneInstall,setIphoneInstall]=useState(false)
 useEffect(()=>{let live=true;setLoaded(false)
 setSupported('serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window)
 const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1
 setIphoneInstall(ios&&!matchMedia('(display-mode: standalone)').matches&&!(navigator as Navigator&{standalone?:boolean}).standalone)
 Promise.all([fetch('/api/portal/preferences?organizationId='+encodeURIComponent(organizationId)).then(async r=>{if(!r.ok)throw Error();return r.json()}),'serviceWorker' in navigator?navigator.serviceWorker.register('/sw.js').then(r=>r.pushManager?.getSubscription()).catch(()=>null):Promise.resolve(null)])
 .then(async ([data,sub])=>{let connected=false;if(sub&&'Notification' in window&&Notification.permission==='granted'){const r=await fetch('/api/portal/push',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({organizationId,action:'status',subscription:sub.toJSON()})});if(!r.ok)throw Error();connected=(await r.json()).subscribed}if(live){setEmail(data.notificationEmail||'');setCanEditEmail(data.canEditEmail);setEmailReady(data.emailConfigured);setPreferences({...defaults,...data.preferences});setEnabled(connected);setLoaded(true)}}).catch(()=>{if(live)setMessage('Unable to load settings. Reload to try again.')})
 return()=>{live=false}
 },[organizationId])
 async function persist(next:Preferences){const r=await fetch('/api/portal/preferences',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({organizationId,...next,...(canEditEmail?{notificationEmail:email}:{})})});if(!r.ok){const data=await r.json();throw Error(data.error||'Could not save notification settings.')};setPreferences(next);window.dispatchEvent(new Event('fc-notifications-changed'))}
 async function save(){setBusy(true);setMessage('');try{await persist(preferences);setMessage('Notification settings saved.')}catch(e){setMessage(e instanceof Error?e.message:'Unable to save.')}finally{setBusy(false)}}
 async function device(action:'enable'|'disable'|'test'){
 setBusy(true);setMessage('')
 try{
 if(!supported)throw Error('Use the in-app inbox in this browser.')
 if(action==='enable'&&await Notification.requestPermission()!=='granted')throw Error('Permission was not granted. You can change it in your browser or phone notification settings.')
 const registration=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready
 let subscription=await registration.pushManager.getSubscription()
 if(action==='enable'){
 const r=await fetch('/api/portal/push?organizationId='+encodeURIComponent(organizationId)),data=await r.json();if(!r.ok)throw Error(data.error)
 if(!subscription){const decoded=atob(data.publicKey.replace(/-/g,'+').replace(/_/g,'/'));const key=Uint8Array.from(decoded,(x:string)=>x.charCodeAt(0));subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key})}
 }
 if(!subscription)throw Error('Enable notifications on this device first.')
 const r=await fetch('/api/portal/push',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({organizationId,action,subscription:subscription.toJSON()})}),data=await r.json();if(!r.ok)throw Error(data.error)
 if(action==='enable'){await persist({...preferences,browser_enabled:true});setEnabled(true);setMessage('This device is connected. Send a test to check delivery.')}
 else if(action==='disable'){setEnabled(false);setMessage('Device alerts disabled for this organization on this device.')}
 else setMessage('Test sent. Look for “Notifications are ready” on this device.')
 }catch(e){setMessage(e instanceof Error?e.message:'Unable to update notifications.')}finally{setBusy(false)}
 }
 const rows:Array<[keyof Preferences,string,string]>=[['new_sales','New sales','A new campaign order is recorded.'],['campaign_milestones','Goal milestones','Your fundraiser crosses 25%, 50%, 75% or 100% of its goal.'],['payout_updates','Payout updates','A payout request or payment changes status.'],['sync_issues','Campaign sync issues','A Shopify update for your campaign needs attention.']]
 return <section className="agency-card portal-notifications"><header><div><h2>Notification Settings</h2><p>Choose your updates and connect each device you want to receive alerts.</p></div></header>
 <div className="portal-notification-section"><h3>In-app inbox</h3><label><span><b>Show campaign notifications</b><small>Read updates using the notification bell.</small></span><input type="checkbox" disabled={!loaded||busy} checked={preferences.in_app_enabled} onChange={e=>setPreferences(p=>({...p,in_app_enabled:e.target.checked}))}/></label></div>
 <div className="portal-notification-section"><h3>Device notifications</h3><p>Get updates even when the app is closed. Delivery normally starts within a few minutes of new activity.</p>{iphoneInstall?<p className="fc-install-notice">On iPhone or iPad, add this site to your Home Screen first. Open the installed app, then return here to enable notifications.</p>:!supported?<p>This browser does not support device alerts. You can still use the in-app inbox.</p>:<div className="fc-device-actions"><button type="button" disabled={!loaded||busy} onClick={()=>device('enable')}>{enabled?'Reconnect this device':'Enable on this device'}</button>{enabled&&<><button type="button" disabled={busy} onClick={()=>device('test')}>Send test notification</button><button type="button" disabled={busy} onClick={()=>device('disable')}>Disable on this device</button></>}</div>}<small>Each team member chooses their own notification permissions.</small></div>
 <div className="portal-notification-section"><h3>Alert me about</h3>{rows.map(([key,title,body])=><label key={key}><span><b>{title}</b><small>{body}</small></span><input type="checkbox" disabled={!loaded||busy} checked={preferences[key]} onChange={e=>setPreferences(p=>({...p,[key]:e.target.checked}))}/></label>)}</div>
 <div className="portal-notification-save"><button type="button" disabled={!loaded||busy} onClick={save}>{busy?'Working…':'Save Notification Settings'}</button><span role="status">{message}</span></div>
 <div className="portal-notification-section"><h3>Email notifications</h3><p>{emailReady?'Connected. New activity is emailed within a few minutes.':'Email delivery is temporarily unavailable. Your preferences are still saved.'}</p><label><span><b>Email me about selected activity</b><small>Uses the categories selected above. Access and approval emails are sent separately.</small></span><input type="checkbox" disabled={!loaded||busy} checked={preferences.email_enabled} onChange={e=>setPreferences(p=>({...p,email_enabled:e.target.checked}))}/></label><label><span>Email address</span><input type="email" disabled={!loaded||busy||!canEditEmail} value={email} placeholder="Add your email to receive notifications" onChange={e=>setEmail(e.target.value)}/></label>{!email&&<p>Add an email address and save to receive email alerts.</p>}<button type="button" disabled={!loaded||busy} onClick={save}>Save email preferences</button></div><InstallGuide/></section>
}
