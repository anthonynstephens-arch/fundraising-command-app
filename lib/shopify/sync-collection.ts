import 'server-only'
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { shopifyGraphQL, stripShopifyGid, getShopifyConfig } from './admin'

type PageInfo = { hasNextPage:boolean; endCursor:string|null }
type Variant = {id:string; title:string; sku:string|null; price:string}
type Product = {id:string; title:string; handle:string; vendor:string; productType:string; status:string; featuredImage:{url:string}|null; variants:{nodes:Variant[];pageInfo:PageInfo}}
type Collection = {id:string;title:string;handle:string;products:{nodes:Product[];pageInfo:PageInfo}}
export const collectionQuery = `query StationCollection($id: ID!, $after: String) {
  collection(id:$id) { id title handle products(first:10,after:$after,sortKey:ID) {
    pageInfo { hasNextPage endCursor }
    nodes { id title handle vendor productType status featuredImage { url }
      variants(first:50) { pageInfo { hasNextPage endCursor } nodes { id title sku price } }
    }
  } }
}`
export const variantsQuery = `query StationProductVariants($id: ID!, $after: String!) {
  product(id:$id) { variants(first:250,after:$after) {
    pageInfo { hasNextPage endCursor } nodes { id title sku price }
  } }
}`
export function collectionGid(value:string) {
  const id=stripShopifyGid(value)
  if(!id || !/^\d+$/.test(id) || (value.includes('/') && !value.startsWith('gid://shopify/Collection/'))) throw new Error('Choose a valid Shopify collection.')
  return 'gid://shopify/Collection/'+id
}
export async function fetchCollection(value:string):Promise<Collection> {
  const id=collectionGid(value)
  let after:string|null=null
  let result:Collection|null=null
  do {
    const data:{collection:Collection|null}=await shopifyGraphQL(collectionQuery,{id,after})
    if(!data.collection) throw new Error('Shopify collection no longer exists. Refresh the collection list.')
    if(!result) result={...data.collection,products:{nodes:[],pageInfo:data.collection.products.pageInfo}}
    for(const product of data.collection.products.nodes) {
      while(product.variants.pageInfo.hasNextPage) {
        const cursor=product.variants.pageInfo.endCursor
        if(!cursor) throw new Error('Shopify returned an incomplete variant page. Retry sync.')
        const more:{product:{variants:Product['variants']}|null}=await shopifyGraphQL(variantsQuery,{id:product.id,after:cursor})
        if(!more.product || more.product.variants.pageInfo.endCursor===cursor) throw new Error('Unable to finish loading product variants. Retry sync.')
        product.variants.nodes.push(...more.product.variants.nodes)
        product.variants.pageInfo=more.product.variants.pageInfo
      }
      result.products.nodes.push(product)
    }
    const page=data.collection.products.pageInfo
    if(!page.hasNextPage) break
    if(!page.endCursor || page.endCursor===after) throw new Error('Unable to finish loading collection products. Retry sync.')
    after=page.endCursor
  } while(true)
  return result!
}
function stableVariantId(campaignId:string,variantId:string) {
  const h=createHash('sha256').update(campaignId+':'+variantId).digest('hex')
  return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`
}
export async function syncCollection(campaignId:string,collectionId:string,organizationId?:string,preloaded?:Collection) {
  const db=createAdminClient()
  const {data:campaign,error:ce}=await db.from('campaigns').select('*').eq('id',campaignId).maybeSingle()
  if(ce) throw ce
  if(!campaign || (organizationId && campaign.organization_id!==organizationId)) throw new Error('This collection fund does not belong to the selected station.')
  const {data:stores,error:se}=await db.from('shopify_stores').select('id,shop_domain,admin_domain').eq('is_active',true)
  const domain=getShopifyConfig().shopDomain.toLowerCase()
  const store=stores?.find(s=>s.shop_domain?.toLowerCase()===domain || s.admin_domain?.toLowerCase()===domain)
  if(se) throw se
  if(!store) throw new Error('The configured Shopify store is not active in Fundraiser Command.')
  const {data:links,error:le}=await db.from('campaign_shopify_collections').select('*').eq('campaign_id',campaignId)
  if(le) throw le
  const target=collectionGid(collectionId)
  const ids=[...new Set([target,...(links||[]).map(m=>collectionGid(m.shopify_collection_id))])]
  // Refresh the union so products shared by two assigned collections remain present.
  const collections:Collection[]=[]
  for(const id of ids) collections.push(preloaded && preloaded.id===id ? preloaded : await fetchCollection(id))
  const products=[...new Map(collections.flatMap(c=>c.products.nodes).map(p=>[p.id,p])).values()]
  const now=new Date().toISOString()
  const savedProducts:any[]=[]
  for(let i=0;i<products.length;i+=200) {
    const {data,error}=await db.from('shopify_products').upsert(products.slice(i,i+200).map(p=>({
      shopify_store_id:store.id,shopify_product_id:stripShopifyGid(p.id),title:p.title,handle:p.handle,vendor:p.vendor||null,product_type:p.productType||null,status:p.status.toLowerCase(),image_url:p.featuredImage?.url||null,synced_at:now,updated_at:now,
    })),{onConflict:'shopify_store_id,shopify_product_id'}).select('id,shopify_product_id')
    if(error) throw error
    savedProducts.push(...(data||[]))
  }
  const productRefs=new Map(savedProducts.map(p=>[p.shopify_product_id,p.id]))
  const variants=products.flatMap(p=>p.variants.nodes.map(v=>({product:p,variant:v})))
  const savedVariants:any[]=[]
  for(let i=0;i<variants.length;i+=200) {
    const {data,error}=await db.from('shopify_variants').upsert(variants.slice(i,i+200).map(({product:p,variant:v})=>({
      shopify_product_ref_id:productRefs.get(stripShopifyGid(p.id)),shopify_variant_id:stripShopifyGid(v.id),title:v.title,sku:v.sku||null,price:Number(v.price),synced_at:now,updated_at:now,
    })),{onConflict:'shopify_product_ref_id,shopify_variant_id'}).select('id,shopify_variant_id')
    if(error) throw error
    savedVariants.push(...(data||[]))
  }
  const variantRefs=new Map(savedVariants.map(v=>[v.shopify_variant_id,v.id]))
  const existing:any[]=[]
  for(let from=0;;from+=1000) {
    const {data,error}=await db.from('campaign_products').select('*').eq('campaign_id',campaignId).order('id').range(from,from+999)
    if(error) throw error
    existing.push(...(data||[]));if((data||[]).length<1000)break
  }
  const byVariant=new Map(existing.map(p=>[p.shopify_variant_id,p]))
  const rows=variants.map(({product:p,variant:v})=>{
    const vid=stripShopifyGid(v.id)!
    const old=byVariant.get(vid)
    return {id:old?.id||stableVariantId(campaignId,vid),campaign_id:campaignId,shopify_product_id:stripShopifyGid(p.id),shopify_variant_id:vid,title:p.title,variant_title:v.title,sku:v.sku||null,image_url:p.featuredImage?.url||null,retail_price:Number(v.price),
      contribution_type:old?.contribution_type||(Number(campaign.fundraising_percentage)>0?'percentage':'fixed'),contribution_value:old?.contribution_value||(old ? 0 : Number(campaign.fundraising_percentage)||Number(campaign.flat_amount_per_item)||0),is_active:old?.is_active??true,
      shopify_product_ref_id:productRefs.get(stripShopifyGid(p.id)),shopify_variant_ref_id:variantRefs.get(vid)}
  })
  for(let i=0;i<rows.length;i+=200) {
    const {error}=await db.from('campaign_products').upsert(rows.slice(i,i+200),{onConflict:'id'})
    if(error)throw error
  }
  const current=new Set(rows.map(r=>r.shopify_variant_id))
  const obsolete=existing.filter(p=>p.shopify_variant_ref_id && !current.has(p.shopify_variant_id)).map(p=>p.id)
  for(let i=0;i<obsolete.length;i+=200) {
    const {error}=await db.from('campaign_products').update({is_active:false}).eq('campaign_id',campaignId).in('id',obsolete.slice(i,i+200))
    if(error)throw error
  }
  const {error:me}=await db.from('campaign_shopify_collections').upsert(collections.map(c=>({campaign_id:campaignId,shopify_store_id:store.id,shopify_collection_id:stripShopifyGid(c.id),title:c.title,handle:c.handle,last_synced_at:now,updated_at:now})),{onConflict:'campaign_id,shopify_collection_id'})
  if(me)throw me
  const added=rows.filter(r=>!byVariant.has(r.shopify_variant_id)).length
  return {success:true,campaignId,campaign:campaign.name,collection:collections[0].title,products:products.length,variants:rows.length,addedToCampaign:added,alreadyLinked:rows.length-added,lastSynced:now}
}
