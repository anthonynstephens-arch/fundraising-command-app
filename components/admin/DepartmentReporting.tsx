'use client'
import { useRef,useState } from 'react'
import { useRouter } from 'next/navigation'
import { reportingDay } from '@/lib/portal/reporting-period'
export default function DepartmentReporting({organizationId,startDate}:{organizationId:string;startDate:string|null}){
  const router=useRouter()
  const [date,setDate]=useState(startDate||'')
  const [saved,setSaved]=useState(startDate||'')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const stop=useRef(false)
  async function save(){
    setBusy(true);setMessage('')
    try{
      const response:Response=await fetch('/api/admin/department-reporting',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({organizationId,startDate:date||null})})
      const result:any=await response.json()
      if(!response.ok)throw new Error(result.error)
      setSaved(date);setMessage('Reporting date saved. Import orders below if you need older history.');router.refresh()
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to save date.')}
    finally{setBusy(false)}
  }
  async function importHistory(){
    setBusy(true);stop.current=false;setMessage('Checking Shopify history access…')
    let cursor:string|null=null
    const through=reportingDay()
    let scanned=0,imported=0
    try{
      do{
        const response:Response=await fetch('/api/admin/department-history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({organizationId,startDate:saved||null,cursor,through})})
        const result:any=await response.json()
        if(!response.ok)throw new Error(result.error)
        scanned+=result.scanned;imported+=result.imported;cursor=result.nextCursor
        setMessage('Checked '+scanned+' Shopify orders; imported or refreshed '+imported+' matching orders…')
      }while(cursor&&!stop.current)
      setMessage((stop.current&&cursor?'Import paused. Run again to safely continue. ':'Import complete. ')+imported+' matching orders imported or refreshed from '+(saved||'all available history')+' through '+through+'.')
      router.refresh()
    }catch(error){setMessage((error instanceof Error?error.message:'Import failed.')+' Completed batches are saved. Run again to retry safely.');router.refresh()}
    finally{setBusy(false)}
  }
  return <section className="fc-card" style={{marginTop:20}}>
    <h2>Order history & contributions</h2>
    <p>Choose the first day this department can see orders and earn contributions. The period runs through today in Detroit time. Existing payouts stay in the ledger.</p>
    <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'end'}}>
      <label>Reporting start date<input aria-label="Reporting start date" type="date" min="1970-01-01" max={reportingDay()} value={date} disabled={busy} onChange={e=>setDate(e.target.value)}/></label>
      <button className="fc-btn fc-btn-primary" disabled={busy} onClick={save}>Save reporting date</button>
      <button className="fc-btn" disabled={busy||date!==saved} onClick={importHistory}>Import historical Shopify orders</button>
      {busy&&<button className="fc-btn" onClick={()=>{stop.current=true}}>Stop after current batch</button>}
    </div>
    <p className="fc-note">Blank means all history. Assign and sync Shopify collections first. Repeating an import updates matching orders without duplicating them.</p>
    <p role="status" aria-live="polite">{message}</p>
  </section>
}
