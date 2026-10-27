const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const {stripTypeScriptTypes}=require('node:module')
function load(path,imports){const exports={};let source=stripTypeScriptTypes(fs.readFileSync(path,'utf8'));const names=[...source.matchAll(/export (?:async )?(?:function|const) (\w+)/g)].map(m=>m[1]);source=source.replace(/import \{([^}]+)\} from '([^']+)'/g,(_,names,path)=>'const {'+names+'}=require('+JSON.stringify(path)+')').replace(/export /g,'')+'\n'+names.map(n=>'exports.'+n+'='+n+';').join('\n');vm.runInNewContext(source,{exports,require:name=>imports[name],process,console:{...console,error:()=>{}},URL,Headers,AbortSignal,Buffer,Error,fetch:imports.fetch||fetch});return exports}
const helpers=load('lib/portal/product-builder.ts',{})
assert.equal(helpers.catalogImageUrl('/catalog-cutouts/test.webp'),'https://detroit-design-studio.vercel.app/catalog-cutouts/test.webp')
assert.equal(helpers.catalogImageUrl('https://cdn.shopify.com/test.jpg'),'https://cdn.shopify.com/test.jpg')
assert.equal(helpers.catalogImageUrl('javascript:alert(1)'),null)
const card=helpers.normalizeCatalogProduct({id:'p',cardImage:{url:'/catalog-cutouts/test.webp'},featuredImage:{url:'https://cdn.shopify.com/test.jpg'}})
assert.equal(card.cardImage.url,'https://detroit-design-studio.vercel.app/catalog-cutouts/test.webp')
assert.equal(card.featuredImage.url,'https://cdn.shopify.com/test.jpg')
assert.deepEqual(JSON.parse(JSON.stringify(helpers.contributionPrice('12',2,30,5))),{customizerPrice:22,base:22,price:30,donation:6})
assert.throws(()=>helpers.contributionPrice(12,2,21.99,5))
assert.deepEqual(JSON.parse(JSON.stringify(helpers.contributionPrice('10.24',1,20,5))),{customizerPrice:15.24,base:15.24,price:20,donation:3.57})
assert.equal(helpers.contributionPrice(10,1,15.01,5).donation,0.01,'Round the 75% share to cents')
for(const bad of [null,'',NaN,Infinity])assert.throws(()=>helpers.contributionPrice(12,2,bad,5))
assert.throws(()=>helpers.assetUrl('https://localhost/art.png'))
assert.throws(()=>helpers.assetUrl('https://cdn.shopify.com@localhost/art.png'))
assert.throws(()=>helpers.assetUrl('http://test.supabase.co/art.png'))
let denied=false,slug='macac',existing=null,savedInput=null,syncs=0,ruleUpdate=null,paginate=false,deniedWrite=false,clears=0,grantedScopes=['read_products'],catalogUrl=null,graphicSaved=null
const collection='gid://shopify/Collection/99'
function dbQuery(table){let update;const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,upsert:value=>{graphicSaved=value;return q},single:async()=>({data:{slug},error:null}),maybeSingle:async()=>({data:{slug},error:null}),update:value=>{update=value;return q},then:resolve=>{if(update)ruleUpdate=update;resolve({data:table==='campaign_shopify_collections'?[{shopify_collection_id:'99',title:'MACAC'}]:table==='organization_graphics'?[{id:'g',name:'MACAC Logo',url:'https://xdlgfhoirpcivtxlxmec.supabase.co/storage/v1/object/public/design-assets/artwork/logo.png'}]:[],error:null})}};return q}
const db={from:dbQuery}
async function gql(query,variables){
  if(query.includes('BuilderPermissions'))return {currentAppInstallation:{app:{title:'Connected test app',apiKey:'public-client-id'},accessScopes:grantedScopes.map(handle=>({handle}))}}
  if(query.includes('BuilderDraft'))return {products:{nodes:existing?[existing]:[]}}
  if(query.includes('BuilderSavedVariants'))return {product:{options:[{name:'Color'},{name:'Size'}],variants:{pageInfo:{hasNextPage:false},nodes:JSON.parse(existing.metafield.value).pricing.map((p,i)=>({id:'gid://shopify/ProductVariant/'+(100+i),sku:p.sku,selectedOptions:[{name:'Color',value:'Black'},{name:'Size',value:i?'2XL':'S'}]}))}}}
  if(query.includes('BuilderCatalog'))return {collections:{nodes:[{id:collection,handle:'customizable-apparel'}]}}
  if(query.includes('BuilderSourcePage'))return {product:{variants:{pageInfo:{hasNextPage:false,endCursor:'end'},nodes:[{id:'gid://shopify/ProductVariant/4',price:'14',selectedOptions:[{name:'Color',value:'Black'},{name:'Size',value:'3XL'}],sku:'BLANK-4'}]}}}
  if(query.includes('BuilderSource'))return {product:{id:'gid://shopify/Product/1',title:'Tee',status:'ACTIVE',inCollection:true,options:[{name:'Color'},{name:'Size'}],variants:{pageInfo:{hasNextPage:paginate,endCursor:paginate?'next':null},nodes:[['1','Black','S',10],['2','Black','2XL',12],['3','White','S',10]].map(([id,color,size,price])=>({id:'gid://shopify/ProductVariant/'+id,price:String(price),selectedOptions:[{name:'Color',value:color},{name:'Size',value:size}],sku:'BLANK-'+id}))}}}
  if(query.includes('BuilderProduct')){if(deniedWrite)throw new Error('Shopify GraphQL ACCESS_DENIED write_products access scope');savedInput=variables.input;existing={id:'gid://shopify/Product/100',handle:variables.input.handle||existing?.handle,status:existing?.status||'DRAFT',metafield:{value:variables.input.metafields[0].value}};return {productSet:{product:existing,userErrors:[]}}}
  if(query.includes('BuilderMedia'))return {product:{media:{nodes:[{status:'READY'}]}}}
  if(query.includes('BuilderChannels'))return {publications:{nodes:[{id:'gid://shopify/Publication/4',name:'Online Store'}]}}
  if(query.includes('BuilderPublish'))return {publishablePublish:{userErrors:[]}}
  if(query.includes('BuilderActivate'))return {productUpdate:{product:{id:existing.id,status:'ACTIVE'},userErrors:[]}}
  if(query.includes('BuilderAssignment'))return {product:{inCollection:false}}
  if(query.includes('BuilderAssign'))return {collectionAddProducts:{userErrors:[]}}
  throw new Error('Unexpected query: '+query)
}
const route=load('app/api/portal/product-builder/route.ts',{
  fetch:async url=>{catalogUrl=new URL(url);return {ok:true,json:async()=>({products:[{id:'p',title:'Jacket',cardImage:{url:'/catalog-cutouts/jacket.webp'},featuredImage:{url:'https://cdn.shopify.com/jacket.jpg'}}],categories:[{id:'outerwear'}],vendors:['Nike'],totalCount:1})}},
  'next/server':{NextResponse:{json:(value,init)=>({value,status:init?.status||200})}},
  '@/lib/portal/authorize-campaign':{authorizeCampaignManagement:async()=>denied?{ok:false,status:403,error:'Denied'}:{ok:true,db,campaign:{id:'campaign'},actorId:'manager'}},
  '@/lib/shopify/admin':{shopifyGraphQL:gql,stripShopifyGid:value=>value.split('/').pop(),clearShopifyAccessToken:()=>{clears++}},
  '@/lib/shopify/sync-collection':{collectionGid:value=>value.startsWith('gid:')?value:'gid://shopify/Collection/'+value,syncCollection:async()=>{syncs++}},
  '@/lib/portal/product-builder':helpers,
})
const draftId='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const design={designId:'saved-design',shopifyProductId:'gid://shopify/Product/1',shopifyVariantId:'gid://shopify/ProductVariant/1',garmentColor:'Black',proofImages:{front:'https://test.supabase.co/proof.png'},placements:{front:{decorationMethod:'Printing',objects:[{type:'image'}]}},artworkFiles:['https://test.supabase.co/original.png']}
const base={organizationId:'org',campaignId:'campaign',draftId,title:'MACAC Tee',retailPrices:{'gid://shopify/ProductVariant/1':25,'gid://shopify/ProductVariant/2':28},collectionId:'99',design}
async function send(body,origin='https://www.fundraisercommand.com'){return route.POST({url:'https://www.fundraisercommand.com/api/portal/product-builder',headers:new Headers({origin}),json:async()=>({...base,...body})})}
;(async()=>{
  const catalog=await route.GET({url:'https://www.fundraisercommand.com/api/portal/product-builder?organizationId=org&campaignId=campaign&catalog=1&category=outerwear&subcategory=vests&vendor=Nike&query=fleece'});assert.equal(catalog.status,200);assert.equal(catalogUrl.searchParams.get('category'),'outerwear');assert.equal(catalogUrl.searchParams.get('subcategory'),'vests');assert.equal(catalogUrl.searchParams.get('vendor'),'Nike');assert.equal(catalogUrl.searchParams.get('query'),'fleece');assert.equal(catalog.value.products[0].cardImage.url,'https://detroit-design-studio.vercel.app/catalog-cutouts/jacket.webp');assert.equal(catalog.value.totalCount,1)
  const check=await route.GET({url:'https://www.fundraisercommand.com/api/portal/product-builder?organizationId=org&campaignId=campaign&refresh=1'});assert.equal(check.status,200);assert.equal(check.value.missingScopes.join(','),'write_products,read_publications,write_publications');assert.equal(clears,1)
  grantedScopes=['write_products','write_publications'];const writable=await route.GET({url:'https://www.fundraisercommand.com/api/portal/product-builder?organizationId=org&campaignId=campaign'});assert.equal(writable.value.missingScopes.length,0,'Write publication scope also permits publication reads');grantedScopes=['read_products']
  denied=true;assert.equal((await send({action:'save'})).status,403);denied=false
  slug='other';assert.equal((await send({action:'save'})).status,403);slug='macac'
  assert.equal((await send({action:'save'},'https://evil.example')).status,403)
  const gallery=await route.GET({url:'https://www.fundraisercommand.com/api/portal/product-builder?organizationId=org&campaignId=campaign&graphics=1'});assert.equal(gallery.value.graphics[0].name,'MACAC Logo')
  denied=true;assert.equal((await send({action:'save-graphic',url:'https://xdlgfhoirpcivtxlxmec.supabase.co/storage/v1/object/public/design-assets/artwork/logo.png',name:'Logo'})).status,403);denied=false
  assert.equal((await send({action:'save-graphic',url:'https://cdn.shopify.com/foreign.png',name:'Wrong source'})).status,400)
  assert.equal((await send({action:'save-graphic',url:'https://xdlgfhoirpcivtxlxmec.supabase.co/storage/v1/object/public/design-assets/artwork/logo.png',name:'Uploaded logo'})).status,200);assert.equal(graphicSaved.organization_id,'org');assert.equal(graphicSaved.created_by,'manager')
  const quote=await send({action:'quote'});assert.equal(quote.status,200);assert.equal(quote.value.prices.length,2);assert.equal(quote.value.prices[0].customizerPrice,15);assert.equal(quote.value.prices[0].base,15);assert.equal(quote.value.prices[0].price,25);assert.equal(quote.value.prices[0].donation,7.5);assert.equal(quote.value.prices[1].base,17);assert.equal(quote.value.prices[1].price,28);assert.equal(quote.value.prices[1].donation,8.25)
  assert.equal(savedInput,null,'Quotes must not create a product')
  paginate=true;const paginated=await send({action:'quote'});assert.equal(paginated.value.prices.length,3);assert.equal(paginated.value.prices[2].base,19);assert.equal(paginated.value.prices[2].donation,0);paginate=false
  assert.equal((await send({action:'save',collectionId:'88'})).status,400)
  assert.equal((await send({action:'save',retailPrices:{}})).status,400,'Every size needs a selling price')
  assert.equal((await send({action:'save',baseMultiplier:1,retailPrices:{'gid://shopify/ProductVariant/1':14.99,'gid://shopify/ProductVariant/2':28}})).status,400,'Server must enforce the base price floor')
  deniedWrite=true;const blocked=await send({action:'save'});assert.equal(blocked.status,403);assert.match(blocked.value.error,/Shopify connection/);assert.ok(!blocked.value.error.includes('GraphQL'));deniedWrite=false
  assert.equal((await send({action:'save'})).status,200)
  assert.equal(savedInput.status,'DRAFT');assert.equal(savedInput.collections,undefined,'Drafts must remain outside live collections')
  assert.equal(savedInput.variants.length,2,'Only selected-color sizes are cloned')
  assert.equal(savedInput.variants[1].price,'28.00','Size upcharges must survive')
  assert.equal(savedInput.variants[0].inventoryItem.tracked,false,'Made-to-order stock must not consume blank inventory')
  const record=JSON.parse(savedInput.metafields[0].value);assert.equal(record.design.artworkFiles[0],design.artworkFiles[0]);assert.equal(record.pricingVersion,3);assert.equal(record.baseMultiplier,1);assert.equal(record.pricing[0].base,15);assert.equal(record.pricing[0].donation,7.5);assert.equal(record.pricing[1].donation,8.25);assert.equal(record.pricing[1].sourceSku,'BLANK-2')
  assert.equal(helpers.builderContribution(record,'campaign',{sku:savedInput.variants[0].inventoryItem.sku,title:'Black / S',price:'25'}),7.5)
  assert.equal(helpers.builderContribution(record,'campaign',{sku:savedInput.variants[1].inventoryItem.sku,title:'Black / 2XL',price:'28'}),8.25)
  assert.equal(helpers.builderContribution(record,'campaign',{sku:savedInput.variants[1].inventoryItem.sku,title:'Black / 2XL',price:'30'}),9.75,'Live price edits must retain the base and update MACAC proceeds')
  assert.equal(helpers.builderContribution({...record,pricingVersion:2},'campaign',{title:'Black / S',price:25}),10,'Keep existing saved pricing agreements intact')
  assert.equal(helpers.builderContribution(record,'other',{title:'Black / S'}),null)
  assert.throws(()=>helpers.builderContribution(record,'campaign',{title:'Missing size'}))
  assert.equal(helpers.builderContribution({campaignId:'campaign',markup:5},'campaign',{title:'Legacy'}),5)
  const previous=savedInput;assert.equal((await send({action:'save'})).value.existing,true);assert.equal(savedInput,previous,'Retries must reuse the original Shopify product')
  const legacy={...record,pricingVersion:2,pricing:record.pricing.map(p=>({...p,base:p.customizerPrice*1.2}))};existing.metafield.value=JSON.stringify(legacy)
  assert.equal((await send({action:'publish'})).status,400,'Old pricing must be upgraded before publication')
  assert.equal((await send({action:'update-pricing',retailPrices:{'gid://shopify/ProductVariant/1':14,'gid://shopify/ProductVariant/2':28}})).status,400,'Saved prices cannot go below the new base')
  const updated=await send({action:'update-pricing'});assert.equal(updated.status,200);assert.equal(updated.value.prices[0].base,15);assert.equal(updated.value.prices[0].donation,7.5);assert.equal(updated.value.prices[1].donation,8.25);assert.equal(savedInput.status,undefined,'Pricing updates preserve publication status');assert.equal(savedInput.files,undefined,'Pricing updates preserve artwork');assert.ok(savedInput.variants.every(v=>v.id),'Pricing updates keep Shopify variant identities')
  assert.equal((await send({action:'publish'})).status,200);assert.equal(syncs,1);assert.equal(ruleUpdate,null,'Publishing must preserve per-variant proceeds rather than overwrite all sizes with one amount')
  existing.metafield.value=JSON.stringify({...record,campaignId:'other'});assert.equal((await send({action:'publish'})).status,400,'Cross-campaign drafts must be rejected')
  console.log('PASS product builder: manager/tenant/origin gates, live quote pricing, selected color and size upcharges, draft isolation, production assets, idempotent saves, publication sync and donations.')
})().catch(e=>{console.error(e);process.exitCode=1})
