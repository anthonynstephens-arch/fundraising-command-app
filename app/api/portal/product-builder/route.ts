import {NextResponse} from 'next/server'
import {authorizeCampaignManagement} from '@/lib/portal/authorize-campaign'
import {shopifyGraphQL,clearShopifyAccessToken} from '@/lib/shopify/admin'
import {collectionGid,syncCollection} from '@/lib/shopify/sync-collection'
import {STUDIO_ORIGIN,BUILDER_NAMESPACE,requireBuilderId,assetUrl,validateDesign,contributionPrice,MACAC_BASE_MULTIPLIER,normalizeCatalogProduct} from '@/lib/portal/product-builder'

export const dynamic='force-dynamic'
export const maxDuration=120
const fee=()=>Number(process.env.CUSTOMIZER_DECORATION_LOCATION_FEE||5)
const queryDraft=`query BuilderDraft($query:String!){ products(first:30,query:$query,sortKey:CREATED_AT,reverse:true){nodes{id title handle status featuredImage{url} metafield(namespace:"fundraiser_builder",key:"record"){value}}}}`
const setProduct=`mutation BuilderProduct($input:ProductSetInput!,$identifier:ProductSetIdentifiers!){productSet(input:$input,identifier:$identifier,synchronous:true){product{id handle status} userErrors{field message}}}`
const updateProduct=`mutation BuilderActivate($product:ProductUpdateInput!){productUpdate(product:$product){product{id status} userErrors{field message}}}`
const publishProduct=`mutation BuilderPublish($id:ID!,$input:[PublicationInput!]!){publishablePublish(id:$id,input:$input){userErrors{field message}}}`
function errors(result:any){if(result?.userErrors?.length)throw new Error(result.userErrors.map((e:any)=>e.message).join(' '));return result}
async function access(organizationId:string,campaignId:string){
  const a=await authorizeCampaignManagement(campaignId,organizationId)
  if(!a.ok)return a
  const {data:org,error}=await a.db.from('organizations').select('slug').eq('id',organizationId).eq('is_active',true).single()
  if(error)throw error
  if(org?.slug!=='macac')return {ok:false as const,status:403,error:'Product builder is available to MACAC managers only.'}
  return a
}
async function getDraft(handle:string,campaignId:string){
  const data=await shopifyGraphQL(queryDraft,{query:`handle:${handle}`})
  const p=data.products.nodes.find((p:any)=>p.handle===handle)
  if(!p)return null
  const record=JSON.parse(p.metafield?.value||'{}')
  if(record.campaignId!==campaignId)throw new Error('This draft belongs to another campaign.')
  return {...p,record}
}
export async function GET(request:Request){
  try{
    const q=new URL(request.url).searchParams
    const a=await access(q.get('organizationId')||'',q.get('campaignId')||'')
    if(!a.ok)return NextResponse.json({error:a.error},{status:a.status})
    if(q.get('graphics')==='1'){
      const {data,error}=await a.db.from('organization_graphics').select('id,name,url').eq('organization_id',q.get('organizationId')!).order('created_at',{ascending:false}).limit(500)
      if(error)throw error
      return NextResponse.json({graphics:data||[]},{headers:{'Cache-Control':'no-store'}})
    }
    if(q.get('catalog')==='1'){
      const url=new URL('/api/shopify/collection',STUDIO_ORIGIN)
      url.searchParams.set('query',(q.get('query')||'').slice(0,100));url.searchParams.set('pageSize','24')
      for(const filter of ['category','subcategory','vendor'])url.searchParams.set(filter,(q.get(filter)||'').slice(0,100))
      if(q.get('cursor'))url.searchParams.set('cursor',q.get('cursor')!)
      const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(30000)})
      if(!response.ok)throw new Error('Unable to load the Design Studio catalog. Retry search.')
      const data=await response.json()
      return NextResponse.json({...data,products:(data.products||[]).map(normalizeCatalogProduct)})
    }
    if(q.get('refresh')==='1')clearShopifyAccessToken()
    const scopeData=await shopifyGraphQL(`query BuilderPermissions{currentAppInstallation{accessScopes{handle}}}`)
    const scopes=new Set(scopeData.currentAppInstallation.accessScopes.map((s:any)=>s.handle))
    const missingScopes=['write_products','read_publications','write_publications'].filter(s=>!scopes.has(s)&&!(s==='read_publications'&&scopes.has('write_publications')))
    const {data:collections,error:collectionError}=await a.db.from('campaign_shopify_collections').select('shopify_collection_id,title').eq('campaign_id',a.campaign.id)
    if(collectionError)throw collectionError
    const result=await shopifyGraphQL(queryDraft,{query:`tag:fc-builder-${a.campaign.id}`})
    return NextResponse.json({missingScopes,collections:collections||[],products:result.products.nodes.map((p:any)=>({id:p.id,title:p.title,handle:p.handle,status:p.status,image:p.featuredImage?.url,record:JSON.parse(p.metafield?.value||'{}')})),locationFee:fee()},{headers:{'Cache-Control':'no-store'}})
  }catch(e){console.error('Product builder read failed',e);return NextResponse.json({error:'Unable to load the product builder. Check Shopify product permissions and try again.'},{status:400})}
}
export async function POST(request:Request){
  try{
    if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid request origin.'},{status:403})
    if(Number(request.headers.get('content-length')||0)>600000)return NextResponse.json({error:'Design is too large.'},{status:413})
    const body=await request.json()
    const a=await access(body.organizationId||'',body.campaignId||'')
    if(!a.ok)return NextResponse.json({error:a.error},{status:a.status})
    if(body.action==='save-graphic'){
      const url=assetUrl(body.url)
      if(new URL(url).hostname!=='xdlgfhoirpcivtxlxmec.supabase.co'||!new URL(url).pathname.startsWith('/storage/v1/object/public/design-assets/artwork/'))throw new Error('Use artwork uploaded through the MACAC designer.')
      const name=typeof body.name==='string'?body.name.trim().slice(0,180):''
      if(!name)throw new Error('Give this artwork a name.')
      const {error}=await a.db.from('organization_graphics').upsert({organization_id:body.organizationId,name,url,created_by:a.actorId},{onConflict:'organization_id,url',ignoreDuplicates:true})
      if(error)throw error
      return NextResponse.json({saved:true})
    }
    const id=requireBuilderId(body.draftId)
    const handle=`macac-${a.campaign.id}-${id}`
    const existing=await getDraft(handle,a.campaign.id)
    if(body.action==='update-pricing'){
      if(!existing)throw new Error('Save this product before updating its pricing.')
      const record=existing.record
      const pricing=(record.pricing||[]).map((p:any)=>{
        if(!Object.prototype.hasOwnProperty.call(body.retailPrices||{},p.sourceVariantId))throw new Error('Set a selling price for every size.')
        const base=record.pricingVersion===2?p.customizerPrice:p.base
        if(!Number.isFinite(base)||base<0)throw new Error('This product needs a fresh customizer quote.')
        return {...p,...contributionPrice(base,1,body.retailPrices[p.sourceVariantId],0)}
      })
      if(!pricing.length)throw new Error('This product needs size pricing.')
      const current=await shopifyGraphQL(`query BuilderSavedVariants($id:ID!){product(id:$id){options{name} variants(first:250){pageInfo{hasNextPage} nodes{id sku selectedOptions{name value}}}}}`,{id:existing.id})
      if(!current.product||current.product.variants.pageInfo.hasNextPage||current.product.variants.nodes.length!==pricing.length)throw new Error('Shopify sizes changed. Contact Detroit Decal before updating pricing.')
      const variants=current.product.variants.nodes.map((v:any)=>{
        const p=pricing.find((row:any)=>row.sku===v.sku)
        if(!p)throw new Error('Unable to match Shopify sizes to saved pricing.')
        return {id:v.id,price:p.price.toFixed(2),optionValues:v.selectedOptions.map((o:any)=>({optionName:o.name,name:o.value}))}
      })
      const updated={...record,pricingVersion:3,markupShare:0.75,baseMultiplier:1,pricing,updatedAt:new Date().toISOString(),updatedBy:a.actorId}
      errors((await shopifyGraphQL(setProduct,{identifier:{id:existing.id},input:{id:existing.id,productOptions:current.product.options.map((o:any)=>({name:o.name,values:[...new Set(current.product.variants.nodes.map((v:any)=>v.selectedOptions.find((x:any)=>x.name===o.name)?.value))].map(name=>({name}))})),variants,metafields:[{namespace:BUILDER_NAMESPACE,key:'record',type:'json',value:JSON.stringify(updated)}]}})).productSet)
      if(existing.status==='ACTIVE')await syncCollection(a.campaign.id,record.collectionId,body.organizationId)
      return NextResponse.json({ok:true,productId:existing.id,prices:pricing})
    }
    if(body.action==='publish'){
      if(!existing)throw new Error('Save the Shopify draft before publishing.')
      if(existing.record.pricingVersion!==3)throw new Error('Save the updated 75% markup pricing before publishing.')
      const {data:links,error}=await a.db.from('campaign_shopify_collections').select('shopify_collection_id').eq('campaign_id',a.campaign.id)
      if(error)throw error
      const collection=links?.find((l:any)=>collectionGid(l.shopify_collection_id)===existing.record.collectionId)
      if(!collection)throw new Error('The saved collection is no longer assigned to MACAC.')
      const media=await shopifyGraphQL(`query BuilderMedia($id:ID!){product(id:$id){media(first:10){nodes{status}}}}`,{id:existing.id})
      if(!media.product?.media.nodes.length||media.product.media.nodes.some((m:any)=>m.status!=='READY'))throw new Error('Shopify is still processing the proof images. Wait a moment and publish again.')
      const channels=await shopifyGraphQL(`query BuilderChannels{publications(first:50){nodes{id name}}}`)
      const channel=channels.publications.nodes.find((p:any)=>p.name==='Online Store')
      if(!channel)throw new Error('The Online Store publishing channel is unavailable.')
      errors((await shopifyGraphQL(updateProduct,{product:{id:existing.id,status:'ACTIVE'}})).productUpdate)
      try { errors((await shopifyGraphQL(publishProduct,{id:existing.id,input:[{publicationId:channel.id}]})).publishablePublish) }
      catch(error){
        if(existing.status==='DRAFT')errors((await shopifyGraphQL(updateProduct,{product:{id:existing.id,status:'DRAFT'}})).productUpdate)
        throw error
      }
      const assignment=await shopifyGraphQL(`query BuilderAssignment($id:ID!,$collection:ID!){product(id:$id){inCollection(id:$collection)}}`,{id:existing.id,collection:existing.record.collectionId})
      if(!assignment.product?.inCollection)errors((await shopifyGraphQL(`mutation BuilderAssign($id:ID!,$products:[ID!]!){collectionAddProducts(id:$id,productIds:$products){userErrors{field message}}}`,{id:existing.record.collectionId,products:[existing.id]})).collectionAddProducts)
      // Sync is retryable. If it fails, the UI retains the existing Shopify product.
      await syncCollection(a.campaign.id,collection.shopify_collection_id,body.organizationId)
      return NextResponse.json({ok:true,productId:existing.id,status:'ACTIVE',url:'/stores/macac'})
    }
    if(!['save','quote'].includes(body.action))throw new Error('Invalid product action.')
    if(existing&&body.action==='save')return NextResponse.json({ok:true,productId:existing.id,status:existing.status,existing:true})
    const design=validateDesign(body.design)
    const title=typeof body.title==='string'?body.title.trim():''
    if(!title||title.length>150)throw new Error('Enter a product name of 1–150 characters.')
    const {data:links,error}=await a.db.from('campaign_shopify_collections').select('shopify_collection_id').eq('campaign_id',a.campaign.id)
    if(error)throw error
    if(!links?.length)throw new Error('Assign a Shopify collection to MACAC before creating products.')
    const target=links.find((l:any)=>collectionGid(l.shopify_collection_id)===collectionGid(String(body.collectionId)))
    if(!target)throw new Error('Choose a collection assigned to this campaign.')
    const catalog=await shopifyGraphQL(`query BuilderCatalog($query:String!){collections(first:2,query:$query){nodes{id handle}}}`,{query:`handle:${process.env.SHOPIFY_CUSTOMIZABLE_COLLECTION_HANDLE||'customizable-apparel'}`})
    const catalogId=catalog.collections.nodes.find((c:any)=>c.handle===(process.env.SHOPIFY_CUSTOMIZABLE_COLLECTION_HANDLE||'customizable-apparel'))?.id
    if(!catalogId)throw new Error('The approved blank garment catalog is unavailable.')
    const data=await shopifyGraphQL(`query BuilderSource($id:ID!,$collection:ID!,$after:String){product(id:$id){id title status inCollection(id:$collection) options{name} variants(first:250,after:$after){pageInfo{hasNextPage endCursor} nodes{id price selectedOptions{name value} sku}}}}`,{id:design.shopifyProductId,collection:catalogId})
    const source=data.product
    if(!source||source.status!=='ACTIVE'||!source.inCollection)throw new Error('Choose an active garment from the approved customizer catalog.')
    while(source.variants.pageInfo.hasNextPage){
      const after=source.variants.pageInfo.endCursor
      if(!after||source.variants.nodes.length>2500)throw new Error('Unable to finish loading garment sizes. Try again.')
      const more=await shopifyGraphQL(`query BuilderSourcePage($id:ID!,$after:String!){product(id:$id){variants(first:250,after:$after){pageInfo{hasNextPage endCursor} nodes{id price selectedOptions{name value} sku}}}}`,{id:source.id,after})
      if(!more.product||more.product.variants.pageInfo.endCursor===after)throw new Error('Unable to finish loading garment sizes. Try again.')
      source.variants.nodes.push(...more.product.variants.nodes)
      source.variants.pageInfo=more.product.variants.pageInfo
    }
    const selected=source.variants.nodes.find((v:any)=>v.id===design.shopifyVariantId)
    if(!selected)throw new Error('The selected garment variant no longer exists.')
    const color=selected.selectedOptions.find((o:any)=>/colou?r/i.test(o.name))
    const variants=source.variants.nodes.filter((v:any)=>!color||v.selectedOptions.some((o:any)=>o.name===color.name&&o.value===color.value))
    if(color?.value!==design.garmentColor&&color)throw new Error('Proof color does not match the selected garment.')
    const locations=Object.keys(design.proofImages).length
    const retailPrices=body.retailPrices||{}
    if(typeof retailPrices!=='object'||Array.isArray(retailPrices))throw new Error('Invalid selling prices.')
    const pricing=variants.map((v:any,i:number)=>{
      if(body.action==='save'&&!Object.prototype.hasOwnProperty.call(retailPrices,v.id))throw new Error('Set a selling price for every size before saving.')
      return {sourceVariantId:v.id,title:v.selectedOptions.map((o:any)=>o.value).join(' / '),sku:`MACAC-${id.slice(0,8)}-${v.id.split('/').pop()}`,sourceSku:v.sku||null,...contributionPrice(v.price,locations,retailPrices[v.id],fee())}
    })
    if(body.action==='quote')return NextResponse.json({prices:pricing,baseMultiplier:MACAC_BASE_MULTIPLIER})
    const record={campaignId:a.campaign.id,organizationId:body.organizationId,draftId:id,collectionId:collectionGid(target.shopify_collection_id),pricingVersion:3,markupShare:0.75,baseMultiplier:MACAC_BASE_MULTIPLIER,locationFee:fee(),pricing,design,createdBy:a.actorId,createdAt:new Date().toISOString()}
    const input={title,handle,status:'DRAFT',vendor:'Detroit Decal & Apparel',tags:['fc-macac-builder',`fc-builder-${a.campaign.id}`],descriptionHtml:`<p>Made to order for MACAC.</p>`,
      productOptions:source.options.map((o:any)=>({name:o.name,values:[...new Set(variants.map((v:any)=>v.selectedOptions.find((s:any)=>s.name===o.name)?.value))].map(name=>({name}))})),
      variants:variants.map((v:any,i:number)=>({price:pricing[i].price.toFixed(2),inventoryPolicy:'CONTINUE',optionValues:v.selectedOptions.map((o:any)=>({optionName:o.name,name:o.value})),inventoryItem:{sku:pricing[i].sku,tracked:false,requiresShipping:true}})),
      files:Object.entries(design.proofImages).map(([placement,url])=>({originalSource:url,contentType:'IMAGE',alt:`${title} — ${placement}`})),
      metafields:[{namespace:BUILDER_NAMESPACE,key:'record',type:'json',value:JSON.stringify(record)}]}
    const result=errors((await shopifyGraphQL(setProduct,{input,identifier:{handle}})).productSet)
    if(!result.product)throw new Error('Shopify did not return a product. Retry with the same draft.')
    return NextResponse.json({ok:true,productId:result.product.id,status:result.product.status})
  }catch(e){
    console.error('Product builder write failed',e)
    const message=e instanceof Error?e.message:'Unable to save this product.'
    if(/ACCESS_DENIED|access scope|Access denied/i.test(message)){clearShopifyAccessToken();return NextResponse.json({error:'The Shopify connection needs permission to create and publish products. Please contact Detroit Decal & Apparel to complete the store connection.'},{status:403})}
    return NextResponse.json({error:message},{status:400})
  }
}
