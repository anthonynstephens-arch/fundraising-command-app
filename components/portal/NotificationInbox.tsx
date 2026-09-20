'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {useDialogAccessibility} from '@/components/public/useDialogAccessibility'
type Item={id:string;title:string;body:string;href:string;created_at:string}
export default function NotificationInbox({organizationId}:{organizationId:string}){
 const [items,setItems]=useState<Item[]>([]),[unread,setUnread]=useState(0),[open,setOpen]=useState(false),[error,setError]=useState('')
 const ref=useDialogAccessibility<HTMLElement>(open,()=>setOpen(false))
 useEffect(()=>{let active=true
 const load=async()=>{if(document.hidden)return;try{const r=await fetch('/api/portal/notifications?organizationId='+encodeURIComponent(organizationId));if(!r.ok)throw Error();const d=await r.json();if(active){setItems(d.events);setUnread(d.unread);setError('')}}catch{if(active)setError('Notifications could not be loaded.')}}
 void load();const timer=setInterval(load,60000);window.addEventListener('fc-notifications-changed',load);document.addEventListener('visibilitychange',load)
 return()=>{active=false;clearInterval(timer);window.removeEventListener('fc-notifications-changed',load);document.removeEventListener('visibilitychange',load)}
 },[organizationId])
 async function markRead(){try{const r=await fetch('/api/portal/preferences',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({organizationId,markNotificationsRead:true})});if(!r.ok)throw Error();setUnread(0);window.dispatchEvent(new Event('fc-notifications-changed'))}catch{setError('Could not mark notifications read.')}}
 return <><button type="button" className="fc-notification-bell" onClick={()=>setOpen(true)} aria-label={'Notifications'+(unread?', '+unread+' unread':'')}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9 21h6"/></svg>{unread>0&&<b>{unread>9?'9+':unread}</b>}</button>{open&&<div className="fc-inbox-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><section ref={ref} role="dialog" aria-modal="true" aria-labelledby="fc-inbox-title" className="fc-inbox"><header><h2 id="fc-inbox-title">Notifications</h2><button type="button" aria-label="Close notifications" onClick={()=>setOpen(false)}>×</button></header><button type="button" onClick={markRead}>Mark all read</button>{error&&<p role="alert">{error}</p>}<div className="fc-inbox-list">{items.length?items.map(e=><Link href={e.href} key={e.id} onClick={()=>setOpen(false)}><strong>{e.title}</strong><p>{e.body}</p><small>{new Date(e.created_at).toLocaleString()}</small></Link>):<p>No notifications yet. New campaign activity will appear here.</p>}</div><Link href={'/portal/notifications?org='+encodeURIComponent(organizationId)} onClick={()=>setOpen(false)}>Notification settings →</Link></section></div>}</>
}
