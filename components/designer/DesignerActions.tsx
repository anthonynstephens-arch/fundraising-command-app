'use client'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
export default function DesignerActions({launch=false}:{launch?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const router=useRouter()
 async function act(){setBusy(true);setError('');try{const res=await fetch(launch?'/api/admin/designer-launch':'/api/pin-session',{method:launch?'POST':'DELETE'});const data=await res.json();if(!res.ok)throw new Error(data.error||'Unable to complete this action.');if(launch)router.refresh();else window.location.assign('/designers/britton-mane/login')}catch(e){setError(e instanceof Error?e.message:'Please try again.')}finally{setBusy(false)}}
 return <div><button className="mane-button" disabled={busy} onClick={act}>{busy?'Please wait…':launch?'Start tracking new sales':'Sign out'}</button>{error&&<p role="alert">{error}</p>}</div>
}
