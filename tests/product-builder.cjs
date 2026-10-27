const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const {stripTypeScriptTypes}=require('node:module')
function load(path,imports){const exports={};let source=stripTypeScriptTypes(fs.readFileSync(path,'utf8'));const names=[...source.matchAll(/export (?:async )?(?:function|const) (\w+)/g)].map(m=>m[1]);source=source.replace(/import \{([^}]+)\} from '([^']+)'/g,(_,names,path)=>'const {'+names+'}=require('+JSON.stringify(path)+')').replace(/export /g,'')+'\n'+names.map(n=>'exports.'+n+'='+n+';').join('\n');vm.runInNewContext(source,{exports,require:name=>imports[name],process,console:{...console,error:()=>{}},URL,Headers,AbortSignal,Buffer});return exports}
const helpers=load('lib/portal/product-builder.ts',{})
assert.deepEqual(JSON.parse(JSON.stringify(helpers.contributionPrice('12',2,7,5))),{base:22,price:29,donation:7})
assert.throws(()=>helpers.contributionPrice(12,2,-1,5))
assert.throws(()=>helpers.assetUrl('https://localhost/art.png'))
assert.throws(()=>helpers.assetUrl('https://cdn.shopify.com@localhost/art.png'))
assert.throws(()=>helpers.assetUrl('http://test.supabase.co/art.png'))
let denied=false,slug='macac',existing=null,savedInput=null,syncs=0,ruleUpdate=null,paginate=false
const collection='gid://shopify/Collection/99'
function dbQuery(table){let update;const q={select:()=>q,eq:()=>q,single:async()=>({data:{slug},error:null}),maybeSingle:async()=>({data:{slug},error:null}),update:value=>{update=value;return q},then:resolve=>{if(update)ruleUpdate=update;resolve({data:table==='campaign_shopify_collections'?[{shopify_collection_id:'99',title:'MACAC'}]:[],error:null})}};return q}
const db={from:dbQuery}
async function gql(query,variables){
  if(query.includes('BuilderDraft'))return {products:{nodes:existing?[existing]:[]}}
  if(query.includes('BuilderCatalog'))return {collections:{nodes:[{id:collection,handle:'customizable-apparel'}]}}
  if(query.includes('BuilderSourcePage'))return {product:{variants:{pageInfo:{hasNextPage:false,endCursor:'end'},nodes:[{id:'gid://shopify/ProductVariant/4',price:'14',selectedOptions:[{name:'Color',value:'Black'},{name:'Size',value:'3XL'}],sku:'BLANK-4'}]}}}
  if(query.includes('BuilderSource'))return {product:{id:'gid://shopify/Product/1',title:'Tee',status:'ACTIVE',inCollection:true,options:[{name:'Color'},{name:'Size'}],variants:{pageInfo:{hasNextPage:paginate,endCursor:paginate?'next':null},nodes:[['1','Black','S',10],['2','Black','2XL',12],['3','White','S',10]].map(([id,color,size,price])=>({id:'gid://shopify/ProductVariant/'+id,price:String(price),selectedOptions:[{name:'Color',value:color},{name:'Size',value:size}],sku:'BLANK-'+id}))}}}
  if(query.includes('BuilderProduct')){savedInput=variables.input;existing={id:'gid://shopify/Product/100',handle:variables.input.handle,status:'DRAFT',metafield:{value:variables.input.metafields[0].value}};return {productSet:{product:existing,userErrors:[]}}}
  if(query.includes('BuilderMedia'))return {product:{media:{nodes:[{status:'READY'}]}}}
  if(query.includes('BuilderChannels'))return {publications:{nodes:[{id:'gid://shopify/Publication/4',name:'Online Store'}]}}
  if(query.includes('BuilderPublish'))return {publishablePublish:{userErrors:[]}}
  if(query.includes('BuilderActivate'))return {productUpdate:{product:{id:existing.id,status:'ACTIVE'},userErrors:[]}}
  if(query.includes('BuilderAssignment'))return {product:{inCollection:false}}
  if(query.includes('BuilderAssign'))return {collectionAddProducts:{userErrors:[]}}
  throw new Error('Unexpected query: '+query)
}
const route=load('app/api/portal/product-builder/route.ts',{
  'next/server':{NextResponse:{json:(value,init)=>({value,status:init?.status||200})}},
  '@/lib/portal/authorize-campaign':{authorizeCampaignManagement:async()=>denied?{ok:false,status:403,error:'Denied'}:{ok:true,db,campaign:{id:'campaign'},actorId:'manager'}},
  '@/lib/shopify/admin':{shopifyGraphQL:gql,stripShopifyGid:value=>value.split('/').pop()},
  '@/lib/shopify/sync-collection':{collectionGid:value=>value.startsWith('gid:')?value:'gid://shopify/Collection/'+value,syncCollection:async()=>{syncs++}},
  '@/lib/portal/product-builder':helpers,
})
const draftId='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const design={designId:'saved-design',shopifyProductId:'gid://shopify/Product/1',shopifyVariantId:'gid://shopify/ProductVariant/1',garmentColor:'Black',proofImages:{front:'https://test.supabase.co/proof.png'},placements:{front:{decorationMethod:'Printing',objects:[{type:'image'}]}},artworkFiles:['https://test.supabase.co/original.png']}
const base={organizationId:'org',campaignId:'campaign',draftId,title:'MACAC Tee',markup:5,collectionId:'99',design}
async function send(body,origin='https://www.fundraisercommand.com'){return route.POST({url:'https://www.fundraisercommand.com/api/portal/product-builder',headers:new Headers({origin}),json:async()=>({...base,...body})})}
;(async()=>{
  denied=true;assert.equal((await send({action:'save'})).status,403);denied=false
  slug='other';assert.equal((await send({action:'save'})).status,403);slug='macac'
  assert.equal((await send({action:'save'},'https://evil.example')).status,403)
  const quote=await send({action:'quote'});assert.equal(quote.status,200);assert.equal(quote.value.prices.length,2);assert.equal(quote.value.prices[0].price,20);assert.equal(quote.value.prices[1].price,22)
  assert.equal(savedInput,null,'Quotes must not create a product')
  paginate=true;const paginated=await send({action:'quote'});assert.equal(paginated.value.prices.length,3);assert.equal(paginated.value.prices[2].price,24);paginate=false
  assert.equal((await send({action:'save',collectionId:'88'})).status,400)
  assert.equal((await send({action:'save'})).status,200)
  assert.equal(savedInput.status,'DRAFT');assert.equal(savedInput.collections,undefined,'Drafts must remain outside live collections')
  assert.equal(savedInput.variants.length,2,'Only selected-color sizes are cloned')
  assert.equal(savedInput.variants[1].price,'22.00','Size upcharges must survive')
  assert.equal(savedInput.variants[0].inventoryItem.tracked,false,'Made-to-order stock must not consume blank inventory')
  const record=JSON.parse(savedInput.metafields[0].value);assert.equal(record.design.artworkFiles[0],design.artworkFiles[0]);assert.equal(record.markup,5)
  const previous=savedInput;assert.equal((await send({action:'save'})).value.existing,true);assert.equal(savedInput,previous,'Retries must reuse the original Shopify product')
  assert.equal((await send({action:'publish'})).status,200);assert.equal(syncs,1);assert.equal(ruleUpdate.contribution_value,5)
  existing.metafield.value=JSON.stringify({...record,campaignId:'other'});assert.equal((await send({action:'publish'})).status,400,'Cross-campaign drafts must be rejected')
  console.log('PASS product builder: manager/tenant/origin gates, live quote pricing, selected color and size upcharges, draft isolation, production assets, idempotent saves, publication sync and donations.')
})().catch(e=>{console.error(e);process.exitCode=1})
