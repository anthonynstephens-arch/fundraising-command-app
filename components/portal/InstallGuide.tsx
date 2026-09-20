'use client'
import {useEffect,useState} from 'react'
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>}
export default function InstallGuide(){
 const [device,setDevice]=useState<'iphone'|'android'|'desktop'>('iphone'),[step,setStep]=useState(0),[installed,setInstalled]=useState(false),[prompt,setPrompt]=useState<InstallEvent|null>(null),[message,setMessage]=useState('')
 useEffect(()=>{
 setDevice(/iPhone|iPad|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1?'iphone':/Android/.test(navigator.userAgent)?'android':'desktop')
 const check=()=>setInstalled(matchMedia('(display-mode: standalone)').matches||!!(navigator as Navigator&{standalone?:boolean}).standalone)
 check();const capture=(e:Event)=>{e.preventDefault();setPrompt(e as InstallEvent)}
 window.addEventListener('beforeinstallprompt',capture);window.addEventListener('appinstalled',check)
 return()=>{window.removeEventListener('beforeinstallprompt',capture);window.removeEventListener('appinstalled',check)}
 },[])
 const steps=device==='iphone'?[
 ['Open in Safari','Open fundraisercommand.com in Safari, then sign in.'],
 ['Tap Share','Tap the Share icon. On newer Safari layouts, open the page menu first, then Share.'],
 ['Add to Home Screen','Scroll through the share options and choose Add to Home Screen. Keep Open as Web App enabled if shown, then tap Add.'],
 ['Open your new app','Launch Fundraiser Command from its Home Screen icon. Open Notifications to enable device alerts.']
 ]:device==='android'?[
 ['Open in Chrome','Open fundraisercommand.com and sign in.'],['Open the browser menu','Tap the three-dot menu at the top of Chrome.'],['Install the app','Choose Install app or Add to Home screen, then confirm.'],['Launch from Home Screen','Open your new Fundraiser Command icon and enable device alerts in Notifications.']
 ]:[['Open the site','Use Chrome or Edge and sign in to Fundraiser Command.'],['Find the install control','Look for Install in the address bar or browser menu. Safari on Mac offers File → Add to Dock.'],['Confirm installation','Choose Install or Add. Your browser will create the app shortcut.'],['Open the app','Launch it from your apps or Dock. Your dashboard is one click away.']]
 return <section className="fc-install-guide"><span className="fc-tour-eyebrow">TAKE YOUR CAMPAIGN WITH YOU</span><h3>{installed?'Your Home Screen app is ready':'Add Fundraiser Command to your phone'}</h3><p>No App Store download needed. Select your device and follow each step.</p>
 <div className="fc-device-tabs" aria-label="Installation device">{(['iphone','android','desktop'] as const).map(d=><button type="button" aria-pressed={device===d} onClick={()=>{setDevice(d);setStep(0)}} key={d}>{d==='iphone'?'iPhone / iPad':d==='android'?'Android':'Computer'}</button>)}</div>
 <div className="fc-install-demo"><div className="fc-phone" aria-hidden="true"><div className="fc-phone-camera"/><div className="fc-phone-screen" key={device+step}><img src="/brand/fundraiser-command-header.webp" alt=""/><div className="fc-phone-step">{step===0?'1':step===1?'↑':step===2?'+':'✓'}</div><strong>{steps[step][0]}</strong><div className="fc-phone-line"/><div className="fc-phone-line short"/></div></div>
 <div className="fc-install-steps">{steps.map(([title,body],i)=><button type="button" key={title} className={step===i?'active':''} aria-current={step===i?'step':undefined} onClick={()=>setStep(i)}><b>{i+1}</b><span><strong>{title}</strong>{step===i&&<small>{body}</small>}</span></button>)}</div></div>
 {prompt&&!installed&&<button type="button" className="fc-tour-primary" onClick={async()=>{try{await prompt.prompt();const result=await prompt.userChoice;setMessage(result.outcome==='accepted'?'Installation accepted. Open the app from your Home Screen.':'You can install later from your browser menu.');setPrompt(null)}catch{setMessage('Use the browser menu to install this app.')}}}>Install app on this device</button>}{message&&<p role="status">{message}</p>}</section>
}
