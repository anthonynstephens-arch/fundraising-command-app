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

export type DmdOrder={
  id:string;name:string;createdAt:string;fulfillmentStatus:string;financialStatus:string;total:string;currency:string;inHandsBy:string|null;
  tracking:{number:string|null;url:string|null;company:string|null}[];
  outstanding?:string;statusUrl?:string|null;paymentUrl?:string|null;paymentTerms?:string|null;
  items?:{title:string;variant:string|null;quantity:number;unitPrice:string}[];
  subtotal?:string;shipping?:string;tax?:string;discount?:string
}

export function formatPrivateOrder(payload:any):DmdOrder{
  const attrs=payload.note_attributes||[]
  return {id:String(payload.id),name:payload.name||`#${payload.order_number}`,createdAt:payload.created_at,
    fulfillmentStatus:payload.cancelled_at?'CANCELLED':String(payload.fulfillment_status||'UNFULFILLED').toUpperCase(),
    financialStatus:String(payload.financial_status||'PENDING').toUpperCase(),
    total:String(payload.total_price||'0'),currency:payload.currency||'USD',
    inHandsBy:attrs.find((a:any)=>a.name==='In hands by')?.value||null,
    outstanding:String(payload.total_outstanding||'0'),statusUrl:payload.order_status_url||null,
    paymentTerms:payload.payment_terms?.payment_terms_name||null,
    subtotal:String(payload.subtotal_price||'0'),shipping:String(payload.total_shipping_price_set?.shop_money?.amount||'0'),tax:String(payload.total_tax||'0'),discount:String(payload.total_discounts||'0'),
    items:(payload.line_items||[]).map((line:any)=>({title:String(line.title||line.name||'Item'),variant:line.variant_title||null,quantity:Number(line.quantity||0),unitPrice:String(line.price||'0')})),
    tracking:(payload.fulfillments||[]).flatMap((f:any)=>f.tracking_info?[f.tracking_info]:f.tracking_number||f.tracking_url?[{number:f.tracking_number,url:f.tracking_url,company:f.tracking_company}]:[]).map((t:any)=>({number:t.number||null,url:t.url||null,company:t.company||null}))}
}

export async function syncDmdOrder(payload:any){
  const attrs=payload.note_attributes||[]
  const privateOrder=attrs.some((a:any)=>a.name==='fundraiser_private_store'&&a.value==='dmd')
  const dmdOrg=attrs.some((a:any)=>a.name==='fundraiser_organization_id'&&a.value===DMD_ORGANIZATION_ID)
  const b2bCompany=String(payload.company?.id||'')===stripShopifyGid(DMD_COMPANY_ID)
  if(!b2bCompany&&!(privateOrder&&dmdOrg))return
  const {error}=await createAdminClient().from(b2bCompany?'dmd_company_orders':'dmd_private_orders').upsert({
    shopify_order_id:String(payload.id),organization_id:DMD_ORGANIZATION_ID,
    order_data:formatPrivateOrder(payload),updated_at:new Date().toISOString()
  },{onConflict:'shopify_order_id'})
  if(error)throw error
}

export async function getDmdPortalOrders(){
  const [companyResult,privateResult]=await Promise.all([
    createAdminClient().from('dmd_company_orders').select('order_data').eq('organization_id',DMD_ORGANIZATION_ID).order('updated_at',{ascending:false}),
    createAdminClient().from('dmd_private_orders').select('order_data').eq('organization_id',DMD_ORGANIZATION_ID).order('updated_at',{ascending:false})
  ])
  if(privateResult.error||companyResult.error)throw privateResult.error||companyResult.error
  const combined=new Map<string,DmdOrder>((companyResult.data||[]).map(row=>{const order=row.order_data as DmdOrder;return [order.id,order]}))
  for(const row of privateResult.data||[]){
    const order=row.order_data as DmdOrder
    if(!combined.has(order.id))combined.set(order.id,order)
  }
  return [...combined.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))
}
