import {getCampaignStorefront,type StoreProduct,type StoreVariant} from '@/lib/public/storefront'
import {DMD_SLUG} from '@/lib/branding/dmd'
import {DMD_REVIEW_PRODUCTS} from '@/lib/branding/dmd-products'
import { isDmdSampleOrder } from '@/lib/branding/dmd'
import { fulfillmentStatus } from '@/lib/orders/status'
import {stripShopifyGid} from '@/lib/shopify/admin'
import {createAdminClient} from '@/lib/supabase/admin'

export const DMD_ORGANIZATION_ID='4eaaf553-8adf-478c-8118-5ddb9795326c'
export const DMD_PRIVATE_COLLECTION_ID='gid://shopify/Collection/661627371813'
export const DMD_COMPANY_ID='gid://shopify/Company/5742690597'

type Variant={id:string;title:string;price:string;inventoryQuantity:number|null;inventoryPolicy:'DENY'|'CONTINUE'}
export type PrivateProduct={id:string;title:string;description:string;image:string|null;variants:Variant[]}

// Map the live storefront to the same base prices shown in the DMD review.
const REVIEW_KEYS:Record<string,string>={
  'detroit-met-zip-up':'cultivator-zip',
  'detroit-met-t-shirt':'comfort-colors-tee',
  'detroit-met-youth-size-t-shirt':'youth-softstyle',
  'detroit-met-logomark-crewneck':'softstyle-crewneck',
  'det-met-long-sleeve-cotton-tee':'long-sleeve',
  'det-met-pocket-7-inch-athletic-short':'pocketed-short',
  'det-met-ring-spun-hoodie':'comfort-colors-hoodie',
}

export async function getDmdPrivateProducts():Promise<PrivateProduct[]>{
  const campaign=await getCampaignStorefront(DMD_SLUG)
  if(!campaign||!campaign.shopifyConnected)throw new Error('The live DMD catalog is temporarily unavailable.')
  return campaign.products.map((product:StoreProduct)=>{
    const review=DMD_REVIEW_PRODUCTS.find(item=>item.id===REVIEW_KEYS[product.handle])
    if(!review)throw new Error('Detroit Decal base pricing needs to be configured for '+product.title)
    return {id:product.id,title:product.title,description:product.description,
      image:product.images[0]?.url||review.image,
      variants:product.variants.map((variant:StoreVariant)=>({id:variant.id,title:variant.title,
        price:review.basePrice.toFixed(2),inventoryQuantity:variant.available?null:0,
        inventoryPolicy:'DENY' as const})),
    }
  })
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
    fulfillmentStatus:(fulfillmentStatus(payload)||'unknown').toUpperCase(),
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
  if(!b2bCompany&&!(privateOrder&&dmdOrg)&&!isDmdSampleOrder(DMD_ORGANIZATION_ID,payload.name||payload.order_number))return
  const {error}=await createAdminClient().from(b2bCompany?'dmd_company_orders':'dmd_private_orders').upsert({
    shopify_order_id:String(payload.id),organization_id:DMD_ORGANIZATION_ID,
    order_data:formatPrivateOrder(payload),updated_at:new Date().toISOString()
  },{onConflict:'shopify_order_id'})
  if(error)throw error
}

export async function getDmdPortalOrders(){
  const [companyResult,privateResult,sampleResult]=await Promise.all([
    createAdminClient().from('dmd_company_orders').select('order_data').eq('organization_id',DMD_ORGANIZATION_ID).order('updated_at',{ascending:false}),
    createAdminClient().from('dmd_private_orders').select('order_data').eq('organization_id',DMD_ORGANIZATION_ID).order('updated_at',{ascending:false}),
    createAdminClient().from('orders').select('*,order_items(*)').eq('organization_id',DMD_ORGANIZATION_ID).in('shopify_order_number',['4791','#4791','4792','#4792'])
  ])
  if(privateResult.error||companyResult.error||sampleResult.error)throw privateResult.error||companyResult.error||sampleResult.error
  const combined=new Map<string,DmdOrder>((companyResult.data||[]).map(row=>{const order=row.order_data as DmdOrder;return [order.id,order]}))
  for(const row of privateResult.data||[]){
    const order=row.order_data as DmdOrder
    if(!combined.has(order.id))combined.set(order.id,order)
  }
  // Include already-imported samples immediately; subsequent webhooks keep full details current.
  for(const row of sampleResult.data||[]){
    const id=String(row.shopify_order_id)
    if(combined.has(id))continue
    combined.set(id,{
      id,name:'#'+String(row.shopify_order_number).replace(/^#/,''),createdAt:row.placed_at,
      fulfillmentStatus:String(row.fulfillment_status||'UNKNOWN').toUpperCase(),
      financialStatus:String(row.status||'UNKNOWN').toUpperCase(),total:String(row.total||0),
      currency:row.currency||'USD',inHandsBy:null,tracking:[],
      items:(row.order_items||[]).map((line:any)=>({title:line.title,variant:line.variant_title||null,quantity:Number(line.quantity||0),unitPrice:String(line.unit_price||0)}))
    })
  }
  return [...combined.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))
}
