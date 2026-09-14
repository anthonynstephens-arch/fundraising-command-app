'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import './collections.css'
type Mapping={id:string;shopify_collection_id:string;title:string;last_synced_at:string|null}
export type StationFund={id:string;name:string;products:number;collections:Mapping[]}
let collectionRequest:Promise<any>|null=null
async function getCollections(force=false) {
  if(force)collectionRequest=null
  if(!collectionRequest)collectionRequest=fetch('/api/shopify/collections',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to load Shopify collections.');return d.collections}).catch(e=>{collectionRequest=null;throw e})
  return collectionRequest
}
export default function StationCollectionManager({stationId,stationName,funds,canAssign}:{stationId:string;stationName:string;funds:StationFund[];canAssign:boolean}) {
  const router=useRouter()
  const [collections,setCollections]=useState<Array<{id:string;title:string;handle:string}>>([])
  const [search,setSearch]=useState(''),[collection,setCollection]=useState(''),[fund,setFund]=useState(funds.length===1?funds[0].id:'')
  const [loading,setLoading]=useState(canAssign),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
  async function load(force=false){setLoading(true);setError('');try{setCollections(await getCollections(force))}catch(e){setError(e instanceof Error?e.message:'Unable to load collections.')}finally{setLoading(false)}}
  useEffect(()=>{if(canAssign)void load()},[canAssign])
  const matching=collections.filter(c=>(c.title+' '+c.handle).toLowerCase().includes(search.toLowerCase()))
  async function sync(collectionId:string,campaignId:string){
    setBusy(true);setError('');setMessage('')
    try {
      const res=await fetch('/api/stations/collections',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stationId,collectionId,campaignId:campaignId||undefined})})
      const d=await res.json()
      if(!res.ok){if(d.campaignId)setFund(d.campaignId);throw Error(d.error||'Sync failed. Retry the collection.')}
      setMessage(`${d.collection} assigned to ${stationName}. ${d.products} products and ${d.variants} variants synced.`)
      setCollection('');setFund(d.campaignId);router.refresh()
    }catch(e){setError(e instanceof Error?e.message:'Unable to sync. Please retry.')}finally{setBusy(false)}
  }
  return <div className="station-collections">
    {canAssign && <section className="station-collection-panel"><h2>Assign Shopify collection</h2><p>Choose the collection for <strong>{stationName}</strong>. Its products will appear in this station’s Products menu after syncing.</p>
      <div className="station-collection-fields">
        <label>Search Shopify collections<input value={search} onChange={e=>{setSearch(e.target.value);setCollection('')}} placeholder="Search by collection name" disabled={busy}/></label>
        <label>Shopify collection<select value={collection} disabled={loading||busy} onChange={e=>setCollection(e.target.value)}><option value="">{loading?'Loading collections…':'Choose a Shopify collection'}</option>{matching.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
        <label>Station fund<select value={fund} disabled={busy} onChange={e=>setFund(e.target.value)}><option value="">Create a fund for this collection</option>{funds.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
      </div><div className="station-collection-actions"><button disabled={loading||busy||!collection} onClick={()=>sync(collection,fund)}>{busy?'Syncing products…':'Assign & sync products'}</button><button className="secondary" disabled={busy||loading} onClick={()=>load(true)}>Refresh Shopify list</button></div>
      {!loading&&!matching.length&&<p>No matching Shopify collections. Try another search or refresh the list.</p>}
    </section>}
    {error&&<p role="alert" className="collection-error">{error}</p>}{message&&<p role="status" className="collection-success">{message}</p>}
    <h2>Assigned collections</h2>
    {!funds.length&&<p>No collection assigned yet.{canAssign?' Choose a Shopify collection above.':' Ask your administrator to assign a Shopify collection to your station.'}</p>}
    {funds.map(f=><section className="station-collection-panel" key={f.id}><header><div><h3>{f.name}</h3><p>{f.products} active products</p></div><Link href={'/station/'+stationId+'/products?campaign='+f.id}>View products →</Link></header>
      {!f.collections.length&&<p>No Shopify collection linked to this fund. {canAssign?'Select this fund above and assign a collection.':'Your administrator can link a collection here.'}</p>}
      {f.collections.map(c=><div className="station-collection-row" key={c.id}><div><strong>{c.title}</strong><span>{c.last_synced_at?'Last synced '+new Date(c.last_synced_at).toLocaleString():'Not synced yet'}</span></div>{canAssign&&<button disabled={busy} onClick={()=>sync(c.shopify_collection_id,f.id)}>{busy?'Syncing…':'Sync now'}</button>}</div>)}
      {canAssign&&<p><Link href={'/station/'+stationId+'/products?campaign='+f.id}>Set product earnings →</Link> · <Link href={'/dashboard/campaigns/'+f.id}>Fund settings →</Link></p>}
    </section>)}
  </div>
}
