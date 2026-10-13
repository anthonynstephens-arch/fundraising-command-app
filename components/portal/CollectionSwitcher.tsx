'use client'
import {useEffect,useState} from 'react'
type Collection={id:string;name:string;organizationId:string;organizationName:string}
export default function CollectionSwitcher({campaignId}:{campaignId?:string}) {
 const [collections,setCollections]=useState<Collection[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('')
 useEffect(()=>{let alive=true;fetch('/api/portal/collections',{cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error('Unable to load your collections.');return r.json()}).then(d=>{if(alive)setCollections(d.collections||[])}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false}},[])
 async function change(id:string){setBusy(true);setError('');try{const r=await fetch('/api/portal/collections',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({campaignId:id})});const d=await r.json();if(!r.ok)throw new Error(d.error);window.location.assign(d.url)}catch(e){setError(e instanceof Error?e.message:'Unable to switch.');setBusy(false)}}
 if(collections.length<2)return error?<p role="alert">{error}</p>:null
 return <div style={{padding:'12px 0',maxWidth:440}}><label style={{display:'grid',gap:6,fontSize:13,fontWeight:700}}>My collections<select aria-label="Switch assigned collection" value={campaignId||''} disabled={busy} onChange={e=>change(e.target.value)} style={{padding:10,borderRadius:8,border:'1px solid #aeb8c5',width:'100%',background:'#fff',color:'#172132'}}><option value="" disabled>Select a collection</option>{collections.map(c=><option key={c.id} value={c.id}>{c.organizationName} · {c.name}</option>)}</select></label>{error&&<p role="alert">{error}</p>}</div>
}
