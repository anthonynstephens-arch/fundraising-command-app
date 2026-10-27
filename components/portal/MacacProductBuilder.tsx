'use client'
import {useEffect,useRef,useState} from 'react'
import {STUDIO_ORIGIN} from '@/lib/portal/product-builder'
import {recordActivity} from '@/lib/activity/client'
import './product-builder.css'

export default function MacacProductBuilder({organizationId,campaignId}:{organizationId:string;campaignId:string}){
  const [query,setQuery]=useState(''),[catalog,setCatalog]=useState<any[]>([]),[cursor,setCursor]=useState<string|null>(null)
  const [products,setProducts]=useState<any[]>([]),[collections,setCollections]=useState<any[]>([]),[collectionId,setCollectionId]=useState('')
  const [design,setDesign]=useState<any>(null),[title,setTitle]=useState(''),[markup,setMarkup]=useState('5'),[locationFee,setLocationFee]=useState(5)
  const [missingScopes,setMissingScopes]=useState<string[]>([])
  const [prices,setPrices]=useState<any[]>([])
  const [draftId,setDraftId]=useState(''),[saved,setSaved]=useState(false),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[waiting,setWaiting]=useState(false)
  const popup=useRef<Window|null>(null),nonce=useRef('')
  const context=new URLSearchParams({organizationId,campaignId}).toString()
  async function json(url:string,init?:RequestInit){const r=await fetch(url,init);const data=await r.json();if(!r.ok||data.error)throw new Error(data.error||'Request failed.');return data}
  async function refresh(reconnect=false){const data=await json('/api/portal/product-builder?'+context+(reconnect?'&refresh=1':''));setMissingScopes(data.missingScopes||[]);setProducts(data.products);setCollections(data.collections);setCollectionId(c=>c||data.collections[0]?.shopify_collection_id||'');setLocationFee(data.locationFee)}
  useEffect(()=>{void refresh().catch(e=>setMessage(e.message))},[organizationId,campaignId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{
    function receive(e:MessageEvent){
      if(e.origin!==STUDIO_ORIGIN||e.source!==popup.current||e.data?.type!=='fc:design-export'||e.data.nonce!==nonce.current)return
      setPrices([]);setDesign(e.data.design);setTitle('MACAC '+(e.data.design.productTitle||'Custom apparel'));setDraftId(crypto.randomUUID());setSaved(false);setWaiting(false);setMessage('Design received. Review the proofs and donation, then save your Shopify draft.')
      popup.current?.postMessage({type:'fc:design-received',nonce:nonce.current},STUDIO_ORIGIN)
    }
    window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive)
  },[])
  async function search(more=false){
    setBusy('catalog');setMessage('')
    try{const data=await json('/api/portal/product-builder?'+context+'&catalog=1&query='+encodeURIComponent(query)+(more&&cursor?'&cursor='+encodeURIComponent(cursor):''));if(data.demo)throw new Error('The customizer catalog is in demo mode. Live products are required.');setCatalog(current=>more?[...current,...data.products]:data.products);setCursor(data.nextCursor||null);if(!data.products.length)setMessage('No matching garments. Try a style number, brand, or garment type.')}
    catch(e){setMessage((e as Error).message)}finally{setBusy('')}
  }
  function launch(product:any){
    nonce.current=crypto.randomUUID()
    const url=new URL('/design',STUDIO_ORIGIN);url.searchParams.set('product',product.id);url.searchParams.set('fundraiserOrigin',window.location.origin);url.searchParams.set('fundraiserNonce',nonce.current)
    popup.current=window.open(url.href,'macac-product-designer','popup,width=1440,height=1000')
    setWaiting(!!popup.current);setMessage(popup.current?'Use the customizer to choose a color, add artwork, and review your design. Then choose “Use in MACAC store.”':'Your browser blocked the customizer window. Allow pop-ups for this site and select Customize again.')
  }
  async function action(type:'save'|'publish'|'quote',id=draftId){
    setBusy(type);setMessage('')
    try{
      const data=await json('/api/portal/product-builder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({organizationId,campaignId,action:type,draftId:id,title,markup:Number(markup),collectionId,design})})
      if(type==='quote'){setPrices(data.prices);setMessage('Live retail prices calculated below.');return}
      if(type==='save')setSaved(true)
      recordActivity('request',`MACAC product ${type}: ${data.productId}`)
      setMessage(type==='save'?'Shopify draft saved. Review the product below, then publish when ready.':'Published to the MACAC store. Your per-item donation is connected to fundraising reports.')
      await refresh()
    }catch(e){setMessage((e as Error).message)}finally{setBusy('')}
  }
  function reset(){setDesign(null);setTitle('');setDraftId('');setSaved(false);setPrices([]);setMessage('');setWaiting(false);nonce.current=''}
  const proofs=Object.entries(design?.proofImages||{}) as [string,string][]
  return <div className="macac-builder">
    <div className="agency-page-head"><div><h1>Create a product</h1><p>Use our Design Studio to build your artwork, then save and publish merchandise to MACAC’s store.</p></div></div>
    <ol className="mb-steps"><li>1. Choose a garment</li><li>2. Customize & review</li><li>3. Price & publish</li></ol>
    {!!missingScopes.length&&<div role="alert" className="mb-message"><strong>Shopify connection setup required</strong><p>Detroit Decal & Apparel needs to finish the store permissions for creating and publishing products. You can browse garments, customize designs, and calculate pricing while the connection is completed.</p><button type="button" disabled={!!busy} onClick={()=>void refresh(true).catch(e=>setMessage(e.message))}>Recheck store connection</button></div>}
    <p role="status" aria-live="polite" className="mb-message">{message}</p>
    {!design&&<section className="agency-card mb-panel"><h2>Start with a blank garment</h2><p>The same garment catalog and artwork tools as Detroit Design Studio. Select a color in the customizer; your product will include that color’s available sizes.</p><form onSubmit={e=>{e.preventDefault();void search()}} className="mb-search"><label htmlFor="mb-query">Search garments<input id="mb-query" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Brand, style number, T-shirt, hoodie…" maxLength={100}/></label><button disabled={!!busy}>{busy==='catalog'?'Searching…':'Search catalog'}</button></form>
      {waiting&&<button type="button" onClick={()=>popup.current?.focus()}>Return to open customizer</button>}
      <div className="mb-catalog">{catalog.map(p=><article key={p.id}>{(p.cardImage?.url||p.featuredImage?.url)&&<img src={p.cardImage?.url||p.featuredImage?.url} alt={p.title}/>}<strong>{p.title}</strong><button type="button" onClick={()=>launch(p)}>Customize</button></article>)}</div>
      {cursor&&<button type="button" disabled={!!busy} onClick={()=>void search(true)}>Load more garments</button>}
    </section>}
    {design&&<section className="agency-card mb-panel"><div className="mb-heading"><h2>Review your product</h2><button type="button" onClick={reset} disabled={!!busy}>Create another</button></div><p>{design.productTitle} · {design.garmentColor||'Selected garment color'} · {proofs.length} print placement{proofs.length===1?'':'s'}</p>
      <div className="mb-review"><div className="mb-proofs">{proofs.map(([side,url])=><figure key={side}><img src={url} alt={side+' proof'}/><figcaption>{side.replace(/([A-Z])/g,' $1')}</figcaption><a href={url} target="_blank" rel="noreferrer">View full-size proof</a></figure>)}</div><div className="mb-fields"><label>Product name<input value={title} maxLength={150} disabled={saved||!!busy} onChange={e=>setTitle(e.target.value)}/></label><label>MACAC collection<select value={collectionId} disabled={saved||!!busy} onChange={e=>setCollectionId(e.target.value)}>{collections.map(c=><option key={c.shopify_collection_id} value={c.shopify_collection_id}>{c.title||'MACAC collection'}</option>)}</select></label><label>Donation per item ($)<input type="number" min="0" max="1000" step="0.01" value={markup} disabled={saved||!!busy} onChange={e=>{setMarkup(e.target.value);setPrices([])}}/></label><p>Retail price = garment price + ${locationFee.toFixed(2)} per printed placement + your ${Number(markup||0).toFixed(2)} donation. Size upcharges are preserved. Printing only; contact us for embroidery.</p><p>Original artwork, placement details, and proofs are saved with the Shopify product for production.</p>{!saved&&<button disabled={!!busy||!title.trim()||!collectionId} onClick={()=>void action('quote')}>{busy==='quote'?'Calculating…':'Calculate retail prices'}</button>}{!!prices.length&&<table><caption>Retail prices by size</caption><thead><tr><th>Variant</th><th>Base</th><th>Retail</th></tr></thead><tbody>{prices.map(p=><tr key={p.title}><td>{p.title}</td><td>${p.base.toFixed(2)}</td><td>${p.price.toFixed(2)}</td></tr>)}</tbody></table>}<button disabled={!!busy||missingScopes.includes('write_products')||saved||!prices.length||!title.trim()||!collectionId} onClick={()=>void action('save')}>{busy==='save'?'Saving…':saved?'Shopify draft saved':'Save Shopify draft'}</button>{saved&&<button disabled={!!busy||!!missingScopes.length} onClick={()=>void action('publish')}>{busy==='publish'?'Publishing…':'Publish to MACAC store'}</button>}</div></div>
    </section>}
    <section className="agency-card mb-panel"><h2>Your created products</h2><p>Drafts stay off the storefront until you publish. If publication or sync is interrupted, retry on the same product.</p><div className="mb-catalog">{products.map(p=><article key={p.id}>{p.image&&<img src={p.image} alt=""/>}<strong>{p.title}</strong><span>{p.status==='ACTIVE'?'Active in Shopify':'Shopify draft'} · ${Number(p.record.markup||0).toFixed(2)} donation</span><button disabled={!!busy} onClick={()=>{setPrices([]);setDesign(p.record.design);setTitle(p.title);setMarkup(String(p.record.markup));setCollectionId(collections.find(c=>c.shopify_collection_id.split('/').pop()===p.record.collectionId.split('/').pop())?.shopify_collection_id||'');setDraftId(p.record.draftId);setSaved(true);setMessage('Saved product loaded. Publishing again safely retries storefront sync.')}}>Review product</button></article>)}</div>{!products.length&&<p>No products created yet.</p>}</section>
  </div>
}
