import {NextResponse} from 'next/server'
import {hasDmdPortalAccess} from '@/lib/shopify/dmd-access'
import {getDmdPrivateProducts,DMD_ORGANIZATION_ID,DMD_COMPANY_ID} from '@/lib/shopify/dmd-private'
import {shopifyGraphQL,stripShopifyGid,toShopifyGid} from '@/lib/shopify/admin'

export const dynamic='force-dynamic'

export async function POST(request:Request){
  if(!await hasDmdPortalAccess())return NextResponse.json({error:'DMD portal access is required.'},{status:403})
  try{
    const body=await request.json()
    const requested=Array.isArray(body.items)?body.items:[]
    const byId=new Map<string,number>()
    for(const item of requested){
      const id=String(item?.variantId||''),quantity=Number(item?.quantity)
      if(!/^\d+$/.test(id)||!Number.isInteger(quantity)||quantity<1||quantity>100)return NextResponse.json({error:'Invalid cart item.'},{status:400})
      byId.set(id,(byId.get(id)||0)+quantity)
    }
    if(!byId.size||byId.size>50||[...byId.values()].some(q=>q>100))return NextResponse.json({error:'Your cart is empty or too large.'},{status:400})
    const date=String(body.inHandsBy||'')
    if(date){
      const parsed=new Date(date+'T12:00:00Z')
      const today=new Date().toISOString().slice(0,10)
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||date<today||date>new Date(Date.now()+366*86400000).toISOString().slice(0,10))return NextResponse.json({error:'Choose a valid future in-hands date within one year.'},{status:400})
    }
    const products=await getDmdPrivateProducts()
    const variants=new Map(products.flatMap(p=>p.variants.map(v=>[stripShopifyGid(v.id)!,v] as const)))
    for(const [id,quantity] of byId){
      const variant=variants.get(id)
      if(!variant||(variant.inventoryPolicy==='DENY'&&variant.inventoryQuantity!==null&&variant.inventoryQuantity<quantity))return NextResponse.json({error:'An item is unavailable. Refresh the private store and try again.'},{status:409})
    }
    const customAttributes=[
      {key:'fundraiser_organization_id',value:DMD_ORGANIZATION_ID},
      {key:'fundraiser_private_store',value:'dmd'},
      {key:'shopify_company_id',value:stripShopifyGid(DMD_COMPANY_ID)!},
    ]
    if(date)customAttributes.push({key:'In hands by',value:date})
    // Never accept a price, discount, title, or Shopify variant from the browser.
    // A draft holds these prices for this authorized order only; public catalog prices stay intact.
    const lineItems=[...byId].map(([id,quantity])=>{
      const variant=variants.get(id)!
      return {variantId:toShopifyGid('ProductVariant',id),quantity,
        priceOverride:{amount:variant.price,currencyCode:'USD'}}
    })
    const result=await shopifyGraphQL(`mutation DmdPrivateCheckout($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) { draftOrder { id invoiceUrl } userErrors { field message } }
    }`,{input:{lineItems,customAttributes,tags:['DMD private store'],
      presentmentCurrencyCode:'USD',acceptAutomaticDiscounts:false,allowDiscountCodesInCheckout:false}})
    const draft=result.draftOrderCreate
    if(draft.userErrors?.length||!draft.draftOrder?.invoiceUrl)throw new Error('Unable to prepare the private order: '+JSON.stringify(draft.userErrors))
    return NextResponse.json({checkoutUrl:draft.draftOrder.invoiceUrl},{headers:{'Cache-Control':'private, no-store'}})

  }catch(error){
    console.error('DMD private checkout failed',error)
    return NextResponse.json({error:'Shopify checkout is unavailable. Please try again.'},{status:500})
  }
}
