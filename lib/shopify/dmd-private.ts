import {shopifyGraphQL,stripShopifyGid} from '@/lib/shopify/admin'
import {createAdminClient} from '@/lib/supabase/admin'

export const DMD_ORGANIZATION_ID='4eaaf553-8adf-478c-8118-5ddb9795326c'
export const DMD_PRIVATE_COLLECTION_ID='gid://shopify/Collection/661627371813'
export const DMD_COMPANY_ID='gid://shopify/Company/5742690597'

type Variant={id:string;title:string;price:string;inventoryQuantity:number|null;inventoryPolicy:'DENY'|'CONTINUE'}
export type PrivateProduct={id:string;title:string;description:string;image:string|null;variants:Variant[]}

const catalogQuery=`query DmdPrivateProducts($id: ID!, $after: String) {
  collection(id: $id) { id title products(first: 100, after: $after) {
    nodes { id title status description featuredMedia { preview { image { url } } }
      variants(first: 100) { nodes { id title price inventoryQuantity inventoryPolicy } pageInfo { hasNextPage endCursor } } }
    pageInfo { hasNextPage endCursor } } }
}`

export async function getDmdPrivateProducts():Promise<PrivateProduct[]>{
  const products:PrivateProduct[]=[]
  let after:string|null=null
  do{
    const result:any=await shopifyGraphQL(catalogQuery,{id:DMD_PRIVATE_COLLECTION_ID,after})
    if(!result.collection)throw new Error('The DMD private Shopify collection could not be found.')
    for(const product of result.collection.products.nodes){
      if(product.status!=='ACTIVE')continue
      // Reject incomplete variant pages instead of silently displaying an unbuyable catalog.
      if(product.variants.pageInfo.hasNextPage)throw new Error(`Too many variants on ${product.title}; contact the store administrator.`)
      products.push({id:product.id,title:product.title,description:product.description,image:product.featuredMedia?.preview?.image?.url||null,variants:product.variants.nodes})
    }
    const page=result.collection.products.pageInfo
    after=page.hasNextPage?page.endCursor:null
    if(page.hasNextPage&&!after)throw new Error('Shopify returned an incomplete private catalog.')
  }while(after)
  return products
}

const companyOrdersQuery=`query DmdCompanyOrders($id: ID!, $after: String) {
  company(id: $id) { id name orders(first: 100, after: $after, reverse: true) {
    nodes { id name createdAt displayFulfillmentStatus displayFinancialStatus cancelledAt
      totalPriceSet { shopMoney { amount currencyCode } } customAttributes { key value }
      fulfillments { status trackingInfo(first: 10) { number url company } } }
    pageInfo { hasNextPage endCursor } } }
}`

export type DmdOrder={id:string;name:string;createdAt:string;fulfillmentStatus:string;financialStatus:string;total:string;currency:string;inHandsBy:string|null;tracking:{number:string|null;url:string|null;company:string|null}[]}

function formatOrder(order:any):DmdOrder{
  return {id:stripShopifyGid(order.id)||order.id,name:order.name,createdAt:order.createdAt,
    fulfillmentStatus:order.cancelledAt?'CANCELLED':order.displayFulfillmentStatus,
    financialStatus:order.displayFinancialStatus,
    total:order.totalPriceSet.shopMoney.amount,currency:order.totalPriceSet.shopMoney.currencyCode,
    inHandsBy:order.customAttributes?.find((a:any)=>a.key==='In hands by')?.value||null,
    tracking:(order.fulfillments||[]).flatMap((f:any)=>f.trackingInfo||[])}
}

export async function getDmdCompanyOrders():Promise<DmdOrder[]>{
  const orders:DmdOrder[]=[]
  let after:string|null=null
  do{
    const result:any=await shopifyGraphQL(companyOrdersQuery,{id:DMD_COMPANY_ID,after})
    if(!result.company)throw new Error('The DMD Shopify company account is unavailable to this integration.')
    orders.push(...result.company.orders.nodes.map(formatOrder))
    const page=result.company.orders.pageInfo
    after=page.hasNextPage?page.endCursor:null
    if(page.hasNextPage&&!after)throw new Error('Shopify returned an incomplete order history.')
  }while(after)
  return orders
}

export function formatPrivateOrder(payload:any):DmdOrder{
  const attrs=payload.note_attributes||[]
  return {id:String(payload.id),name:payload.name||`#${payload.order_number}`,createdAt:payload.created_at,
    fulfillmentStatus:payload.cancelled_at?'CANCELLED':String(payload.fulfillment_status||'UNFULFILLED').toUpperCase(),
    financialStatus:String(payload.financial_status||'PENDING').toUpperCase(),
    total:String(payload.total_price||'0'),currency:payload.currency||'USD',
    inHandsBy:attrs.find((a:any)=>a.name==='In hands by')?.value||null,
    tracking:(payload.fulfillments||[]).flatMap((f:any)=>(f.tracking_info?[f.tracking_info]:[])).map((t:any)=>({number:t.number||null,url:t.url||null,company:t.company||null}))}
}

export async function syncDmdPrivateOrder(payload:any){
  const attrs=payload.note_attributes||[]
  const privateOrder=attrs.some((a:any)=>a.name==='fundraiser_private_store'&&a.value==='dmd')
  const dmdOrg=attrs.some((a:any)=>a.name==='fundraiser_organization_id'&&a.value===DMD_ORGANIZATION_ID)
  if(!privateOrder||!dmdOrg)return
  const {error}=await createAdminClient().from('dmd_private_orders').upsert({
    shopify_order_id:String(payload.id),organization_id:DMD_ORGANIZATION_ID,
    order_data:formatPrivateOrder(payload),updated_at:new Date().toISOString()
  },{onConflict:'shopify_order_id'})
  if(error)throw error
}

export async function getDmdPortalOrders(){
  const [companyResult,privateResult]=await Promise.all([
    getDmdCompanyOrders().then(orders=>({orders,error:false})).catch(error=>{console.error('DMD Shopify company order read failed',error);return {orders:[] as DmdOrder[],error:true}}),
    createAdminClient().from('dmd_private_orders').select('order_data').eq('organization_id',DMD_ORGANIZATION_ID).order('updated_at',{ascending:false})
  ])
  if(privateResult.error)throw privateResult.error
  const combined=new Map<string,DmdOrder>(companyResult.orders.map(order=>[order.id,order]))
  for(const row of privateResult.data||[]){
    const order=row.order_data as DmdOrder
    if(!combined.has(order.id))combined.set(order.id,order)
  }
  return {orders:[...combined.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),companyError:companyResult.error}
}
