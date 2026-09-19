import {NextResponse} from "next/server"
import {createAdminClient} from "@/lib/supabase/admin"
import {getShopifyConfig,shopifyGraphQL,toShopifyGid} from "@/lib/shopify/admin"

export const dynamic="force-dynamic"

type CheckoutVariant={id:string;inventoryQuantity:number|null;inventoryPolicy:"DENY"|"CONTINUE";product:{status:string}}
const checkoutQuery=`query ValidateCampaignCart($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on ProductVariant {
      id inventoryQuantity inventoryPolicy
      product { status }
    }
  }
}`

function numericId(value:string){return value.includes("/")?(value.split("/").pop()||value):value}

export async function POST(request:Request){
  try{
    const body=await request.json()
    const campaignSlug=typeof body.campaignSlug==="string"?body.campaignSlug:""
    const requested=Array.isArray(body.items)?body.items:[]
    const consolidated=new Map<string,number>()
    for(const item of requested){
      const variantId=String(item?.variantId||"")
      const quantity=Number(item?.quantity)
      if(!/^\d+$/.test(variantId)||!Number.isInteger(quantity)||quantity<1||quantity>100)continue
      consolidated.set(variantId,(consolidated.get(variantId)||0)+quantity)
    }
    if(!campaignSlug||!consolidated.size)return NextResponse.json({error:"Your cart is empty or invalid."},{status:400})
    const db=createAdminClient()
    const {data:campaign,error:campaignError}=await db.from("campaigns").select("id,slug,organization_id,status,starts_at,ends_at").eq("slug",campaignSlug).maybeSingle()
    if(campaignError)throw campaignError
    const now=Date.now()
    if(!campaign||campaign.status!=="active"||(campaign.starts_at&&new Date(campaign.starts_at).getTime()>now)||(campaign.ends_at&&new Date(campaign.ends_at).getTime()<now))return NextResponse.json({error:"This fundraiser is not currently accepting orders."},{status:409})
    const variantIds=[...consolidated.keys()]
    const {data:assigned,error:assignedError}=await db.from("campaign_products").select("shopify_variant_id").eq("campaign_id",campaign.id).eq("is_active",true).in("shopify_variant_id",variantIds)
    if(assignedError)throw assignedError
    const assignedIds=new Set((assigned||[]).map(row=>String(row.shopify_variant_id)))
    if(assignedIds.size!==variantIds.length)return NextResponse.json({error:"One or more items are no longer offered by this fundraiser. Please refresh your cart."},{status:409})
    const live=await shopifyGraphQL<{nodes:Array<CheckoutVariant|null>}>(checkoutQuery,{ids:variantIds.map(id=>toShopifyGid("ProductVariant",id))})
    const liveMap=new Map(live.nodes.filter((item):item is CheckoutVariant=>!!item).map(item=>[numericId(item.id),item]))
    for(const id of variantIds){
      const variant=liveMap.get(id)
      const quantity=consolidated.get(id)!
      const available=variant&&variant.product.status==="ACTIVE"&&(variant.inventoryPolicy==="CONTINUE"||variant.inventoryQuantity===null||variant.inventoryQuantity>=quantity)
      if(!available)return NextResponse.json({error:"An item in your cart just became unavailable. Please return to the product and choose another option."},{status:409})
    }
    const {shopDomain}=getShopifyConfig()
    const lines=variantIds.map(id=>`${id}:${consolidated.get(id)}`).join(",")
    const params=new URLSearchParams()
    params.set("attributes[fundraiser_campaign_id]",campaign.id)
    params.set("attributes[fundraiser_campaign_slug]",campaign.slug)
    params.set("attributes[fundraiser_organization_id]",campaign.organization_id)
    params.set("utm_source","fundraiser_command")
    params.set("utm_medium","storefront")
    params.set("utm_campaign",campaign.slug)
    return NextResponse.json({checkoutUrl:`https://${shopDomain}/cart/${lines}?${params.toString()}`})
  }catch(error){
    console.error("Storefront checkout handoff failed",error)
    return NextResponse.json({error:"We could not prepare Shopify checkout. Please try again."},{status:500})
  }
}
