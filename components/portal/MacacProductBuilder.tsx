'use client'
import {useEffect,useRef,useState} from 'react'
import {STUDIO_ORIGIN,catalogImageUrl} from '@/lib/portal/product-builder'
import {recordActivity} from '@/lib/activity/client'
import './product-builder.css'

type CatalogCategory={id:string;name:string;count:number;children:{id:string;name:string;count:number}[]}
function CatalogProductImage({product}:{product:any}){
  const [index,setIndex]=useState(0)
  const sources=[...new Set([product.cardImage?.url,product.featuredImage?.url].map(catalogImageUrl).filter((url):url is string=>!!url))]
  return sources[index]?<img src={sources[index]} alt={product.title} loading="lazy" decoding="async" onError={()=>setIndex(current=>current+1)}/>:<div className="mb-image-placeholder">Image unavailable</div>
}

export default function MacacProductBuilder({organizationId,campaignId}:{organizationId:string;campaignId:string}){
  const [query,setQuery]=useState(''),[catalog,setCatalog]=useState<any[]>([]),[cursor,setCursor]=useState<string|null>(null)
  const [activeQuery,setActiveQuery]=useState(''),[category,setCategory]=useState(''),[subcategory,setSubcategory]=useState(''),[vendor,setVendor]=useState('')
  const [categories,setCategories]=useState<CatalogCategory[]>([]),[vendors,setVendors]=useState<string[]>([]),[totalCount,setTotalCount]=useState<number|null>(null)
  const catalogRequest=useRef<AbortController|null>(null)
  const [products,setProducts]=useState<any[]>([]),[collections,setCollections]=useState<any[]>([]),[collectionId,setCollectionId]=useState('')
  const [design,setDesign]=useState<any>(null),[title,setTitle]=useState('')
  const [missingScopes,setMissingScopes]=useState<string[]>([])
  const [prices,setPrices]=useState<any[]>([])
  const [draftId,setDraftId]=useState(''),[saved,setSaved]=useState(false),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[waiting,setWaiting]=useState(false)
  const popup=useRef<Window|null>(null),nonce=useRef('')
  const context=new URLSearchParams({organizationId,campaignId}).toString()
  async function json(url:string,init?:RequestInit){const r=await fetch(url,init);const data=await r.json();if(!r.ok||data.error)throw new Error(data.error||'Request failed.');return data}
  async function refresh(reconnect=false){const data=await json('/api/portal/product-builder?'+context+(reconnect?'&refresh=1':''));setMissingScopes(data.missingScopes||[]);setProducts(data.products);setCollections(data.collections);setCollectionId(c=>c||data.collections[0]?.shopify_collection_id||'')}
  useEffect(()=>{void refresh().catch(e=>setMessage(e.message))},[organizationId,campaignId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{
    function receive(e:MessageEvent){
      if(e.origin!==STUDIO_ORIGIN||e.source!==popup.current||e.data?.type!=='fc:design-export'||e.data.nonce!==nonce.current)return
      setPrices([]);setDesign(e.data.design);setTitle('MACAC '+(e.data.design.productTitle||'Custom apparel'));setDraftId(crypto.randomUUID());setSaved(false);setWaiting(false);setMessage('Design received. Review the proofs, get your base pricing, and set your selling prices.')
      popup.current?.postMessage({type:'fc:design-received',nonce:nonce.current},STUDIO_ORIGIN)
    }
    window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive)
  },[])
  async function search(more=false){
    catalogRequest.current?.abort()
    const controller=new AbortController();catalogRequest.current=controller
    setBusy('catalog');setMessage('');if(!more)setCatalog([])
    const params=new URLSearchParams({organizationId,campaignId,catalog:'1',query:activeQuery,category,subcategory,vendor})
    if(more&&cursor)params.set('cursor',cursor)
    try{
      const data=await json('/api/portal/product-builder?'+params,{signal:controller.signal})
      if(controller.signal.aborted)return
      if(data.demo)throw new Error('The customizer catalog is in demo mode. Live products are required.')
      setCatalog(current=>more?[...current,...data.products]:data.products);setCursor(data.nextCursor||null)
      setCategories(data.categories||[]);setVendors(data.vendors||[]);setTotalCount(data.totalCount??data.products.length)
      if(!data.products.length)setMessage('No matching garments. Try another category, subcategory, brand, or search term.')
    }catch(e){if((e as Error).name!=='AbortError')setMessage((e as Error).message)}
    finally{if(catalogRequest.current===controller)setBusy('')}
  }
  useEffect(()=>{void search();return()=>catalogRequest.current?.abort()},[organizationId,campaignId,activeQuery,category,subcategory,vendor]) // eslint-disable-line react-hooks/exhaustive-deps
  const currentCategory=categories.find(item=>item.id===category)

  function launch(product:any){
    nonce.current=crypto.randomUUID()
    const url=new URL('/design',STUDIO_ORIGIN);url.searchParams.set('product',product.id);url.searchParams.set('fundraiserOrigin',window.location.origin);url.searchParams.set('fundraiserNonce',nonce.current)
    popup.current=window.open(url.href,'macac-product-designer','popup,width=1440,height=1000')
    setWaiting(!!popup.current);setMessage(popup.current?'Use the customizer to choose a color, add artwork, and review your design. Then choose “Use in MACAC store.”':'Your browser blocked the customizer window. Allow pop-ups for this site and select Customize again.')
  }
  async function action(type:'save'|'publish'|'quote',id=draftId){
    setBusy(type);setMessage('')
    try{
      const data=await json('/api/portal/product-builder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({organizationId,campaignId,action:type,draftId:id,title,retailPrices:Object.fromEntries(prices.map(p=>[p.sourceVariantId,p.price])),collectionId,design})})
      if(type==='quote'){setPrices(data.prices);setMessage('Live retail prices calculated below.');return}
      if(type==='save')setSaved(true)
      recordActivity('request',`MACAC product ${type}: ${data.productId}`)
      setMessage(type==='save'?'Shopify draft saved. Review the product below, then publish when ready.':'Published to the MACAC store. Your per-item donation is connected to fundraising reports.')
      await refresh()
    }catch(e){setMessage((e as Error).message)}finally{setBusy('')}
  }
  function reset(){setDesign(null);setTitle('');setDraftId('');setSaved(false);setPrices([]);setMessage('');setWaiting(false);nonce.current=''}
  const money=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value)
  function earningsLabel(rows:any[],legacy=0){
    if(!rows?.length)return money(legacy)
    const amounts=rows.map(p=>(Math.round(Number(p.price)*100)-Math.round(Number(p.base)*100))/100)
    const low=Math.min(...amounts),high=Math.max(...amounts)
    return low===high?money(low):`${money(low)}–${money(high)}`
  }
  function setStartingPrice(raw:string){
    const startingBase=Math.min(...prices.map(p=>p.base))
    setPrices(current=>current.map(p=>({...p,price:raw===''?'':(Math.round((p.base+Number(raw)-startingBase)*100)/100).toFixed(2)})))
  }
  const validPrices=prices.length>0&&prices.every(p=>p.price!==''&&Number.isFinite(Number(p.price))&&Math.round(Number(p.price)*100)>=Math.round(p.base*100))
  const starting=prices.length?prices.reduce((a,b)=>a.base<=b.base?a:b):null
  const proofs=Object.entries(design?.proofImages||{}) as [string,string][]
  return <div className="macac-builder">
    <div className="agency-page-head"><div><h1>Create a product</h1><p>Use our Design Studio to build your artwork, then save and publish merchandise to MACAC’s store.</p></div></div>
    <ol className="mb-steps"><li>1. Choose a garment</li><li>2. Customize & review</li><li>3. Price & publish</li></ol>
    {!!missingScopes.length&&<div role="alert" className="mb-message"><strong>Shopify connection setup required</strong><p>Detroit Decal & Apparel needs to finish the store permissions for creating and publishing products. You can browse garments, customize designs, and calculate pricing while the connection is completed.</p><button type="button" disabled={!!busy} onClick={()=>void refresh(true).catch(e=>setMessage(e.message))}>Recheck store connection</button></div>}
    <p role="status" aria-live="polite" className="mb-message">{message}</p>
    {!design&&<section className="agency-card mb-panel"><h2>Start with a blank garment</h2><p>Browse by category and subcategory, choose a brand, or search by garment name and style number.</p>
      <div className="mb-filters">
        <label>Category<select value={category} onChange={e=>{setCategory(e.target.value);setSubcategory('')}}><option value="">All categories</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name} ({c.count})</option>)}</select></label>
        <label>Subcategory<select value={subcategory} disabled={!category||!currentCategory?.children.length} onChange={e=>setSubcategory(e.target.value)}><option value="">{category?'All subcategories':'Choose a category first'}</option>{currentCategory?.children.map(c=><option key={c.id} value={c.id}>{c.name} ({c.count})</option>)}</select></label>
        <label>Shop by brand<select value={vendor} onChange={e=>setVendor(e.target.value)}><option value="">All brands</option>{vendors.map(name=><option key={name} value={name}>{name}</option>)}</select></label>
      </div>
      <form onSubmit={e=>{e.preventDefault();if(activeQuery===query.trim())void search();else setActiveQuery(query.trim())}} className="mb-search"><label htmlFor="mb-query">Search garments<input id="mb-query" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Garment name or style number…" maxLength={100}/></label><button disabled={!!busy}>{busy==='catalog'?'Searching…':'Search catalog'}</button><button type="button" className="mb-clear" disabled={!!busy} onClick={()=>{setQuery('');setActiveQuery('');setCategory('');setSubcategory('');setVendor('')}}>Clear filters</button></form>
      <p className="mb-result-count" role="status">{busy==='catalog'?'Loading garments…':totalCount!==null?`${totalCount.toLocaleString()} matching items · ${catalog.length} shown`:''}</p>
      {waiting&&<button type="button" onClick={()=>popup.current?.focus()}>Return to open customizer</button>}
      <div className="mb-catalog">{catalog.map(p=><article key={p.id}><CatalogProductImage product={p}/><small>{p.vendor}</small><strong>{p.title}</strong><button type="button" disabled={!!busy} onClick={()=>launch(p)}>Customize</button></article>)}</div>
      {cursor&&<button type="button" disabled={!!busy} onClick={()=>void search(true)}>Load more garments</button>}
    </section>}
    {design&&<section className="agency-card mb-panel"><div className="mb-heading"><h2>Name and price your MACAC product</h2><button type="button" onClick={reset} disabled={!!busy}>Create another</button></div><p>{design.productTitle} · {design.garmentColor||'Selected garment color'} · {proofs.length} print placement{proofs.length===1?'':'s'}</p>
      <div className="mb-review"><div className="mb-proofs">{proofs.map(([side,url])=><figure key={side}><img src={url} alt={side+' proof'}/><figcaption>{side.replace(/([A-Z])/g,' $1')}</figcaption><a href={url} target="_blank" rel="noreferrer">View full-size proof</a></figure>)}</div><div className="mb-fields">
        <label>What should this item be called?<input value={title} maxLength={150} disabled={saved||!!busy} onChange={e=>setTitle(e.target.value)}/></label>
        <label>MACAC collection<select value={collectionId} disabled={saved||!!busy} onChange={e=>setCollectionId(e.target.value)}>{collections.map(c=><option key={c.shopify_collection_id} value={c.shopify_collection_id}>{c.title||'MACAC collection'}</option>)}</select></label>
        <p>The base price covers fulfillment, printing, and platform costs. Set your customer-facing selling price. MACAC receives the entire difference above the base price.</p>
        {!saved&&<button disabled={!!busy||!title.trim()||!collectionId} onClick={()=>void action('quote')}>{busy==='quote'?'Calculating…':prices.length?'Refresh base pricing':'Get base pricing'}</button>}
        {starting&&<div className="mb-price-summary">
          <div><span>BASE PRICE</span><strong>{money(starting.base)}</strong></div>
          <label><span>Your starting selling price</span><input aria-label="Starting selling price" inputMode="decimal" type="number" min={starting.base} max="10000" step="0.01" value={starting.price} disabled={saved||!!busy} onChange={e=>setStartingPrice(e.target.value)}/></label>
          <div className="mb-proceeds"><span>MACAC receives per sale</span><strong>{validPrices?earningsLabel(prices):'Check your prices'}</strong></div>
          <p>Changing the starting price applies the same donation to every size and preserves size upcharges. You can also adjust individual size prices below.</p>
        </div>}
        {!!prices.length&&<div className="mb-price-table"><table><caption>Customer pricing by size</caption><thead><tr><th>Variant</th><th>Our base</th><th>Your selling price</th><th>MACAC receives</th></tr></thead><tbody>{prices.map((p,i)=><tr key={p.sourceVariantId}><td>{p.title}</td><td>{money(p.base)}</td><td><input aria-label={p.title+' selling price'} inputMode="decimal" type="number" step="0.01" min={p.base} max="10000" value={p.price} disabled={saved||!!busy} onChange={e=>setPrices(current=>current.map((row,index)=>index===i?{...row,price:e.target.value}:row))}/></td><td>{p.price!==''&&Number(p.price)>=p.base?money((Math.round(Number(p.price)*100)-Math.round(p.base*100))/100):'Below base'}</td></tr>)}</tbody></table></div>}
        {!!prices.length&&!validPrices&&<p role="alert">Each selling price must be at least the Detroit Decal base price for that size.</p>}
        <p>Original artwork, placement details, and proofs are saved with the Shopify product for production. Self-service products use printing; contact us for embroidery.</p>
        <button disabled={!!busy||missingScopes.includes('write_products')||saved||!validPrices||!title.trim()||!collectionId} onClick={()=>void action('save')}>{busy==='save'?'Saving…':saved?'Shopify draft saved':'Save Shopify draft'}</button>
        {saved&&<button disabled={!!busy||!!missingScopes.length} onClick={()=>void action('publish')}>{busy==='publish'?'Publishing…':'Publish to MACAC store'}</button>}
      </div></div>
    </section>}
    <section className="agency-card mb-panel"><h2>Your created products</h2><p>Drafts stay off the storefront until you publish. If publication or sync is interrupted, retry on the same product.</p><div className="mb-catalog">{products.map(p=><article key={p.id}>{p.image&&<img src={p.image} alt=""/>}<strong>{p.title}</strong><span>{p.status==='ACTIVE'?'Active in Shopify':'Shopify draft'} · {earningsLabel(p.record.pricing,p.record.markup||0)} to MACAC per sale</span><button disabled={!!busy} onClick={()=>{setPrices(p.record.pricing||[]);setDesign(p.record.design);setTitle(p.title);setCollectionId(collections.find(c=>c.shopify_collection_id.split('/').pop()===p.record.collectionId.split('/').pop())?.shopify_collection_id||'');setDraftId(p.record.draftId);setSaved(true);setMessage('Saved product loaded. Publishing again safely retries storefront sync.')}}>Review product</button></article>)}</div>{!products.length&&<p>No products created yet.</p>}</section>
  </div>
}
