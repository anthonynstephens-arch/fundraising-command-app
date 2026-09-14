const assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto')
const swc=require('next/dist/build/swc')
const root=path.resolve(__dirname,'..')
function load(file,mocks={}) {
 const exports={}
 const code=swc.transformSync(fs.readFileSync(path.join(root,file),'utf8'),{filename:file,jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}}).code
 vm.runInNewContext(code,{exports,console,require:n=>n in mocks?mocks[n]:require(n),URLSearchParams,Buffer,crypto})
 return exports
}
const {resolvePortalContext,stationNavigation}=load('lib/portal/context.ts')
const pin={organizationId:'plymouth',role:'admin'}
assert.equal(resolvePortalContext('detroit',true,[],pin).organizationId,'detroit')
assert.equal(resolvePortalContext('detroit',true,[],pin).usePin,false)
assert.equal(resolvePortalContext('detroit',false,[],pin).denied,true)
assert.equal(resolvePortalContext('detroit',false,[{organization_id:'detroit',role:'viewer'}],pin).role,'viewer')
assert.equal(resolvePortalContext(undefined,false,[],pin).organizationId,'plymouth')
for(const [,href] of stationNavigation('detroit')) assert.ok(href==='/station'||href.startsWith('/station/detroit'))
const tables={
 organizations:[{id:'detroit',name:'Engine test',organization_type:'detroit_fire_station',is_active:true}],
 campaigns:[{id:'fund',organization_id:'detroit',name:'Engine fund'}],
 shopify_stores:[{id:'store',shop_domain:'store.example',admin_domain:'store.myshopify.com',is_active:true}],
 campaign_shopify_collections:[{campaign_id:'fund',shopify_collection_id:'2',title:'Secondary'}],
 shopify_products:[],shopify_variants:[],
 campaign_products:[{id:'original',campaign_id:'fund',shopify_variant_id:'1',title:'Old title',retail_price:5,contribution_type:'fixed',contribution_value:7,is_active:true},{id:'retired',campaign_id:'fund',shopify_variant_id:'999',shopify_variant_ref_id:'ref999',is_active:true}],
}
let sequence=0
function tableQuery(table) {
 let filters=[],range=null,limit=null,op='select',values=null,conflict='id'
 const q={limit(n){limit=n;return q},insert(v){op="insert";values=Array.isArray(v)?v:[v];return q},select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},order(){return q},range(a,b){range=[a,b];return q},
 upsert(v,options){op='upsert';values=v;conflict=options.onConflict;return q},update(v){op='update';values=v;return q},
 maybeSingle(){return execute(true)},single(){return execute(true)},then(resolve,reject){return execute().then(resolve,reject)}}
 async function execute(single=false) {
  let rows=tables[table]
  if(op==='insert'){ rows=values.map(v=>({id:'generated-'+(++sequence),...v}));tables[table].push(...rows) }
  else if(op==='upsert')rows=values.map(v=>{
   const old=tables[table].find(r=>conflict.split(',').every(k=>r[k]===v[k]))
   if(old){Object.assign(old,v);return old}
   const created={id:v.id||'generated-'+(++sequence),...v};tables[table].push(created);return created
  })
  else {rows=rows.filter(r=>filters.every(f=>f(r)));if(op==='update')rows.forEach(r=>Object.assign(r,values))}
  if(limit)rows=rows.slice(0,limit)
  if(range)rows=rows.slice(range[0],range[1]+1)
  return {data:single?rows[0]||null:rows.map(r=>({...r})),error:null}
 }
 return q
}
let calls=[],failCollection=false
const variant=n=>({id:'gid://shopify/ProductVariant/'+n,title:'Size '+n,sku:'SKU-'+n,price:'25.00'})
const product=(id,vs,next=false)=>({id:'gid://shopify/Product/'+id,title:'Updated shirt '+id,handle:'shirt-'+id,vendor:'Vendor',productType:'Shirt',status:'ACTIVE',featuredImage:{url:'https://images.example/new.png'},variants:{nodes:vs,pageInfo:{hasNextPage:next,endCursor:next?'variants-50':null}}})
async function shopifyGraphQL(query,args) {
 calls.push({query,args})
 if(query.includes('StationProductVariants'))return {product:{variants:{nodes:Array.from({length:201},(_,i)=>variant(i+51)),pageInfo:{hasNextPage:false,endCursor:'end'}}}}
 if(failCollection)return {collection:null}
 const second=args.id.endsWith('/2')
 const nodes=second?[product('secondary',[variant(400)])]:args.after?[product('second-page',[variant(300)])]:[product('first',Array.from({length:50},(_,i)=>variant(i+1)),true)]
 return {collection:{id:args.id,title:second?'Secondary':'Primary',handle:'collection',products:{nodes,pageInfo:{hasNextPage:!second&&!args.after,endCursor:!second&&!args.after?'products-10':null}}}}
}
const sync=load('lib/shopify/sync-collection.ts',{'server-only':{},'@/lib/supabase/admin':{createAdminClient:()=>({from:tableQuery})},'./admin':{shopifyGraphQL,getShopifyConfig:()=>({shopDomain:'store.myshopify.com'}),stripShopifyGid:v=>String(v).split('/').pop()}})
;(async()=>{
 const result=await sync.syncCollection('fund','1','detroit')
 assert.equal(result.variants,253)
 assert.equal(result.products,3)
 assert.ok(calls.some(c=>c.args.after==='products-10'))
 assert.ok(calls.some(c=>c.args.after==='variants-50'))
 const old=tables.campaign_products.find(p=>p.id==='original')
 assert.equal(old.title,'Updated shirt first');assert.equal(old.retail_price,25);assert.equal(old.contribution_value,7)
 assert.equal(old.image_url,'https://images.example/new.png')
 assert.equal(tables.campaign_products.find(p=>p.id==='retired').is_active,false)
 assert.ok(tables.campaign_products.some(p=>p.shopify_variant_id==='400'&&p.is_active))
 const count=tables.campaign_products.length
 const repeat=await sync.syncCollection('fund','1','detroit')
 assert.equal(tables.campaign_products.length,count);assert.equal(repeat.addedToCampaign,0)
 assert.ok(tables.campaign_shopify_collections.every(c=>c.last_synced_at))
 await assert.rejects(()=>sync.syncCollection('fund','1','plymouth'),/does not belong/)
 failCollection=true
 const before=JSON.stringify(tables)
 await assert.rejects(()=>sync.syncCollection('fund','1','detroit'),/no longer exists/)
 assert.equal(JSON.stringify(tables),before)
 failCollection=false
 const endpoint=load('app/api/stations/collections/route.ts',{
 'next/server':{NextResponse:{json:(body,{status=200}={})=>({body,status})}},'next/cache':{revalidatePath(){}},
 '@/lib/admin/require-platform-admin':{requirePlatformAdmin:async()=>({ok:true})},
 '@/lib/supabase/admin':{createAdminClient:()=>({from:tableQuery})},
 '@/lib/stations/data':{STATION_TYPE:'detroit_fire_station'},
 '@/lib/shopify/sync-collection':sync,
 '@/lib/shopify/admin':{stripShopifyGid:v=>String(v).split('/').pop()},
 })
 const invalid=await endpoint.POST({json:async()=>({stationId:'detroit',campaignId:'plymouth-fund',collectionId:'1'})})
 assert.equal(invalid.status,403)
 const assigned=await endpoint.POST({json:async()=>({stationId:'detroit',collectionId:'3'})})
 assert.equal(assigned.status,200)
 assert.equal(tables.campaigns.length,2)
 const again=await endpoint.POST({json:async()=>({stationId:'detroit',collectionId:'3'})})
 assert.equal(again.status,200);assert.equal(tables.campaigns.length,2)
 assert.equal(tables.campaigns.find(c=>c.id===assigned.body.campaignId).organization_id,'detroit')
 assert.ok(tables.campaign_products.some(p=>p.campaign_id===assigned.body.campaignId))
 console.log('PASS: assign-and-sync creates a station fund and visible products, retries reuse the fund, cross-station assignment rejected.')
 console.log('PASS: stale PIN isolation, station menu destinations, product + variant pagination, configured admin domain, repeat sync, metadata refresh, preserved earnings, multi-collection union, removed products, wrong-station rejection, and missing-collection no-write behavior.')
})().catch(e=>{console.error(e);process.exitCode=1})
