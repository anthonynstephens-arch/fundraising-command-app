'use client'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { recordActivity } from '@/lib/activity/client'
export default function ActivityTracker(){
 const path=usePathname()
 const query=useSearchParams().toString()
 useEffect(()=>{
   recordActivity('page_view')
   const click=(event:MouseEvent)=>{const a=(event.target as Element)?.closest?.('a[download]') as HTMLAnchorElement|null;if(a)recordActivity('download',a.download||'File')}
   document.addEventListener('click',click,true)
   const original=window.fetch
   const wrapped:typeof fetch=async(input,init)=>{
     const response=await original(input,init)
     const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href)
     const method=(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase()
     if(url.origin===location.origin&&url.pathname.startsWith('/api/')&&url.pathname!=='/api/activity'&&method!=='GET'){
       recordActivity('request',`${method} ${url.pathname} · HTTP ${response.status}`,location.pathname)
     }
     return response
   }
   window.fetch=wrapped
   return()=>{document.removeEventListener('click',click,true);if(window.fetch===wrapped)window.fetch=original}
 },[path,query])
 return null
}
