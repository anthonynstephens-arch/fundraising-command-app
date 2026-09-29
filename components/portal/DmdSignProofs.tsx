'use client'

import {useCallback,useEffect,useState} from 'react'
import './dmd-sign-proofs.css'

type Selection={id:string;front_proof:number;back_proof:number;selected_by_name:string;created_at:string}
const proofs=Array.from({length:10},(_,i)=>i+1)
const src=(n:number)=>`/dmd/proofs/sign-${String(n).padStart(2,'0')}.jpeg`

export default function DmdSignProofs({organizationId,adminView}:{organizationId:string;adminView:boolean}){
  const [front,setFront]=useState<number|null>(null)
  const [back,setBack]=useState<number|null>(null)
  const [selections,setSelections]=useState<Selection[]>([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [large,setLarge]=useState<number|null>(null)

  const load=useCallback(async()=>{
    try{
      const response=await fetch(`/api/portal/dmd-sign-proofs?organizationId=${encodeURIComponent(organizationId)}`,{cache:'no-store'})
      const result=await response.json()
      if(!response.ok) throw new Error(result.error||'Could not load selections.')
      setSelections(result.selections)
      setError('')
    }catch(e){setError(e instanceof Error?e.message:'Could not load selections.')}
    finally{setLoading(false)}
  },[organizationId])
  useEffect(()=>{void load()},[load])

  async function save(){
    if(front===null||back===null||saving)return
    setSaving(true);setError('');setMessage('')
    try{
      const response=await fetch('/api/portal/dmd-sign-proofs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({organizationId,frontProof:front,backProof:back})})
      const result=await response.json()
      if(!response.ok) throw new Error(result.error||'Could not save your selection.')
      setMessage(`Saved: Proof ${String(front).padStart(2,'0')} front · Proof ${String(back).padStart(2,'0')} back`)
      await load()
    }catch(e){setError(e instanceof Error?e.message:'Could not save your selection.')}
    finally{setSaving(false)}
  }

  return <div className="dmd-proofs">
    <header className="dmd-proofs-heading"><div><span className="dmd-proofs-eyebrow">DMD · SIGN DESIGN</span><h1>PROOFS</h1><p>Choose one design for the front and a different design for the back. Save the pairing for review.</p></div><span className="dmd-proofs-count">10 DESIGNS</span></header>

    <div className="dmd-proofs-layout">
      <section className="dmd-proofs-gallery" aria-label="Sign design options">
        {proofs.map(n=><article className={`dmd-proof-card${front===n?' is-front':''}${back===n?' is-back':''}`} key={n}>
          <button type="button" className="dmd-proof-image" onClick={()=>setLarge(n)} aria-label={`Enlarge proof ${n}`}><img src={src(n)} alt={`Sign design proof ${String(n).padStart(2,'0')}`} loading="lazy"/></button>
          <div className="dmd-proof-card-bottom"><strong>PROOF {String(n).padStart(2,'0')}</strong><div className="dmd-proof-actions"><button type="button" aria-pressed={front===n} disabled={back===n} onClick={()=>{setFront(front===n?null:n);setMessage('')}}>Front</button><button type="button" aria-pressed={back===n} disabled={front===n} onClick={()=>{setBack(back===n?null:n);setMessage('')}}>Back</button></div></div>
        </article>)}
      </section>
      <aside className="dmd-proof-selection"><span className="dmd-proofs-eyebrow">YOUR PAIRING</span><h2>Front &amp; back</h2><div className="dmd-proof-pair">
        <div><span>FRONT</span>{front?<button type="button" onClick={()=>setLarge(front)} aria-label="Enlarge selected front"><img src={src(front)} alt={`Front proof ${front}`}/></button>:<div className="dmd-proof-placeholder">Choose a front</div>}<strong>{front?`Proof ${String(front).padStart(2,'0')}`:'No selection'}</strong></div>
        <div><span>BACK</span>{back?<button type="button" onClick={()=>setLarge(back)} aria-label="Enlarge selected back"><img src={src(back)} alt={`Back proof ${back}`}/></button>:<div className="dmd-proof-placeholder">Choose a back</div>}<strong>{back?`Proof ${String(back).padStart(2,'0')}`:'No selection'}</strong></div>
      </div><button type="button" className="dmd-proof-save" disabled={front===null||back===null||saving} onClick={save}>{saving?'Saving…':'Save pairing'}</button>{message&&<p className="dmd-proof-success" role="status">{message}</p>}{error&&<p className="dmd-proof-error" role="alert">{error}</p>}</aside>
    </div>

    <section className="dmd-proof-history"><div className="dmd-proof-history-head"><div><span className="dmd-proofs-eyebrow">SAVED PAIRINGS</span><h2>{adminView?'DMD selections':'Your selections'}</h2></div><button type="button" onClick={()=>{setLoading(true);void load()}}>Refresh</button></div>
      {loading?<p>Loading selections…</p>:selections.length?<div className="dmd-proof-history-grid">{selections.map(item=><article key={item.id}><div className="dmd-proof-history-images"><div><span>FRONT · {String(item.front_proof).padStart(2,'0')}</span><img src={src(item.front_proof)} alt={`Front design ${item.front_proof}`}/></div><div><span>BACK · {String(item.back_proof).padStart(2,'0')}</span><img src={src(item.back_proof)} alt={`Back design ${item.back_proof}`}/></div></div><p><strong>{item.selected_by_name}</strong><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString('en-US',{timeZone:'America/Detroit',dateStyle:'medium',timeStyle:'short'})} ET</time></p></article>)}</div>:<p>No pairings saved yet.</p>}
    </section>

    {large!==null&&<div className="dmd-proof-lightbox" role="dialog" aria-modal="true" aria-label={`Proof ${large} enlarged`} onClick={()=>setLarge(null)} onKeyDown={e=>{if(e.key==='Escape')setLarge(null)}}><button type="button" autoFocus onClick={()=>setLarge(null)} aria-label="Close enlarged proof">×</button><img src={src(large)} alt={`Sign design proof ${String(large).padStart(2,'0')}`} onClick={e=>e.stopPropagation()}/></div>}
  </div>
}
