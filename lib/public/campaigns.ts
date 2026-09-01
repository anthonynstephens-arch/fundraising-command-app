import { createAdminClient } from "@/lib/supabase/admin"

const n = (v: unknown) => Number.isFinite(Number(v ?? 0)) ? Number(v ?? 0) : 0

export async function getPublicCampaign(slug: string) {
  const db = createAdminClient()

  const { data: campaign, error } = await db.from("campaigns").select(`
    id,name,slug,description,status,goal_amount,starts_at,ends_at,hero_image_url,
    public_store_url,custom_domain,organization_id,
    organization:organizations(name,slug,logo_url,website_url)
  `).eq("slug", slug).in("status", ["active","completed"]).maybeSingle()

  if (error) throw error
  if (!campaign) return null

  const { data: cps, error: cpError } = await db.from("campaign_products").select(`
    id,shopify_product_id,shopify_variant_id,title,variant_title,sku,image_url,
    retail_price,contribution_type,contribution_value,shopify_product_ref_id
  `).eq("campaign_id", campaign.id).eq("is_active", true)
  if (cpError) throw cpError

  const rows = cps ?? []
  const cpIds = rows.map((x:any)=>x.id)
  const refIds = [...new Set(rows.map((x:any)=>x.shopify_product_ref_id).filter(Boolean))]

  const [{data: products},{data: items},{data: mappings},{data: stores}] = await Promise.all([
    refIds.length ? db.from("shopify_products").select("id,handle,image_url").in("id", refIds) : Promise.resolve({data:[]}),
    cpIds.length ? db.from("order_items").select("order_id,campaign_product_id,quantity,unit_price,contribution_amount,refunded_contribution_amount").in("campaign_product_id", cpIds) : Promise.resolve({data:[]}),
    db.from("campaign_shopify_collections").select("handle").eq("campaign_id", campaign.id).limit(1),
    db.from("shopify_stores").select("shop_domain").eq("organization_id", campaign.organization_id).eq("is_active", true).limit(1),
  ])

  const pmap = new Map((products ?? []).map((p:any)=>[p.id,p]))
  const shopDomain = stores?.[0]?.shop_domain || "detroitdecalandapparel.com"
  const collectionHandle = mappings?.[0]?.handle
  const storeUrl = campaign.public_store_url || (collectionHandle ? `https://${shopDomain}/collections/${collectionHandle}` : null)

  const grouped = new Map<string, any>()
  for (const row of rows as any[]) {
    const key = row.shopify_product_id || row.shopify_product_ref_id || row.title
    const normalized:any = row.shopify_product_ref_id ? pmap.get(row.shopify_product_ref_id) : null
    const price = n(row.retail_price)
    if (!grouped.has(key)) grouped.set(key, {
      productId:String(row.shopify_product_id || key),
      title:row.title,
      imageUrl:row.image_url || normalized?.image_url || null,
      productUrl:normalized?.handle ? `https://${shopDomain}/products/${normalized.handle}` : storeUrl,
      minPrice:price,maxPrice:price,variants:[]
    })
    const g = grouped.get(key)
    g.minPrice = Math.min(g.minPrice, price); g.maxPrice = Math.max(g.maxPrice, price)
    g.variants.push({id:row.id,title:row.variant_title,sku:row.sku,price,contributionType:row.contribution_type,contributionValue:n(row.contribution_value)})
  }

  const orderIds = [...new Set((items ?? []).map((x:any)=>x.order_id).filter(Boolean))]
  let valid = new Set<string>()
  if (orderIds.length) {
    const {data: orders} = await db.from("orders").select("id,status").in("id", orderIds).neq("status","cancelled")
    valid = new Set((orders ?? []).map((o:any)=>o.id))
  }

  let sales=0,raised=0,refunded=0,units=0
  for (const item of (items ?? []) as any[]) {
    if (!valid.has(item.order_id)) continue
    sales += n(item.unit_price)*n(item.quantity)
    raised += n(item.contribution_amount)
    refunded += n(item.refunded_contribution_amount)
    units += n(item.quantity)
  }

  const netRaised = Math.max(0, raised-refunded)
  const goalAmount = n(campaign.goal_amount)
  const org:any = Array.isArray((campaign as any).organization) ? (campaign as any).organization[0] : (campaign as any).organization

  return {
    ...campaign,
    goalAmount,
    storeUrl,
    organization:{name:org?.name || "Fundraising Organization",slug:org?.slug || "",logoUrl:org?.logo_url || null,websiteUrl:org?.website_url || null},
    stats:{sales,raised,refunded,netRaised,orderCount:valid.size,units,progress:goalAmount>0?Math.min(100,(netRaised/goalAmount)*100):0},
    products:[...grouped.values()].sort((a,b)=>a.title.localeCompare(b.title)),
  }
}

export async function getPublicCampaigns() {
  const db = createAdminClient()
  const {data,error} = await db.from("campaigns").select("slug").in("status",["active","completed"]).order("starts_at",{ascending:false,nullsFirst:false})
  if (error) throw error
  const all = await Promise.all((data ?? []).map((x:any)=>getPublicCampaign(x.slug)))
  return all.filter(Boolean) as any[]
}