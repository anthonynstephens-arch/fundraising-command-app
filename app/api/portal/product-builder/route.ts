import {NextResponse} from 'next/server'
import {authorizeCampaignManagement} from '@/lib/portal/authorize-campaign'
import {shopifyGraphQL,stripShopifyGid,clearShopifyAccessToken} from '@/lib/shopify/admin'
import {collectionGid,syncCollection} from '@/lib/shopify/sync-collection'
import {STUDIO_ORIGIN,BUILDER_NAMESPACE,requireBuilderId,validateDesign,contributionPrice} from '@/lib/portal/product-builder'

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
    if(q.get('catalog')==='1'){
      const url=new URL('/api/shopify/collection',STUDIO_ORIGIN)
      url.searchParams.set('query',(q.get('query')||'').slice(0,100));url.searchParams.set('pageSize','24')
      if(q.get('cursor'))url.searchParams.set('cursor',q.get('cursor')!)
      const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(30000)})
      if(!response.ok)throw new Error('Unable to load the Design Studio catalog. Retry search.')
      return NextResponse.json(await response.json())
    }
    if(q.get('refresh')==='1')clearShopifyAccessToken()
    const scopeData=await shopifyGraphQL(`query BuilderPermissions{currentAppInstallation{accessScopes{handle}}}`)
    const scopes=new Set(scopeData.currentAppInstallation.accessScopes.map((s:any)=>s.handle))
    const missingScopes=['write_products','read_publications','write_publications'].filter(s=>!scopes.has(s))
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
    const id=requireBuilderId(body.draftId)
    const handle=`macac-${a.campaign.id}-${id}`
    const existing=await getDraft(handle,a.campaign.id)
    if(body.action==='publish'){
      if(!existing)throw new Error('Save the Shopify draft before publishing.')
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
      const {error:ruleError}=await a.db.from('campaign_products').update({contribution_type:'fixed',contribution_value:existing.record.markup}).eq('campaign_id',a.campaign.id).eq('shopify_product_id',stripShopifyGid(existing.id))
      if(ruleError)throw ruleError
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
    const pricing=variants.map((v:any)=>contributionPrice(v.price,locations,body.markup,fee()))
    if(body.action==='quote')return NextResponse.json({prices:variants.map((v:any,i:number)=>({title:v.selectedOptions.map((o:any)=>o.value).join(' / '),...pricing[i]}))})
    const record={campaignId:a.campaign.id,organizationId:body.organizationId,draftId:id,collectionId:collectionGid(target.shopify_collection_id),markup:pricing[0].donation,locationFee:fee(),basePrices:variants.map((v:any,i:number)=>({sourceVariantId:v.id,base:pricing[i].base,sku:v.sku})),design,createdBy:a.actorId,createdAt:new Date().toISOString()}
    const input={title,handle,status:'DRAFT',vendor:'Detroit Decal & Apparel',tags:['fc-macac-builder',`fc-builder-${a.campaign.id}`],descriptionHtml:`<p>Made to order for MACAC.</p>`,
      productOptions:source.options.map((o:any)=>({name:o.name,values:[...new Set(variants.map((v:any)=>v.selectedOptions.find((s:any)=>s.name===o.name)?.value))].map(name=>({name}))})),
      variants:variants.map((v:any,i:number)=>({price:pricing[i].price.toFixed(2),inventoryPolicy:'CONTINUE',optionValues:v.selectedOptions.map((o:any)=>({optionName:o.name,name:o.value})),inventoryItem:{sku:`MACAC-${id.slice(0,8)}-${v.sku||i}`,tracked:false,requiresShipping:true}})),
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
