import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function getPortalData(requestedOrg?:string, requestedCampaign?:string){
  const auth=await createClient()
  const {data:{user}}=await auth.auth.getUser()
  if(!user) redirect("/login")
  const db=createAdminClient()

  const [{data:platform},{data:memberships}]=await Promise.all([
    db.from("platform_admins").select("role").eq("user_id",user.id).eq("is_active",true).maybeSingle(),
    db.from("organization_members").select("organization_id,role").eq("user_id",user.id)
  ])

  let organizationId=requestedOrg||memberships?.[0]?.organization_id||null
  if(organizationId&&!platform&&!memberships?.some((m:any)=>m.organization_id===organizationId)) organizationId=null
  if(!organizationId&&platform){
    const {data:first}=await db.from("organizations").select("id").eq("is_active",true).order("name").limit(1).maybeSingle()
    organizationId=first?.id||null
  }
  if(!organizationId) redirect("/apply")

  const [{data:org},{data:campaigns},{data:orders},{data:items},{data:payouts},{data:members},{data:allOrgs},{data:lastWebhook}]=await Promise.all([
    db.from("organizations").select("*").eq("id",organizationId).maybeSingle(),
    db.from("campaigns").select("*").eq("organization_id",organizationId).order("created_at",{ascending:false}),
    db.from("orders").select("*").eq("organization_id",organizationId).order("placed_at",{ascending:false}),
    db.from("order_items").select("*"),
    db.from("payouts").select("*").eq("organization_id",organizationId).order("created_at",{ascending:false}),
    db.from("organization_members").select("*").eq("organization_id",organizationId).order("created_at"),
    platform?db.from("organizations").select("id,name").eq("is_active",true).order("name"):Promise.resolve({data:[] as any[]}),
    db.from("webhook_events").select("created_at,processed_at,event_type").not("processed_at","is",null).order("created_at",{ascending:false}).limit(1).maybeSingle()
  ])
  if(!org) redirect("/apply")

  const allCampaigns=campaigns||[]
  const selectedCampaign=
    (requestedCampaign&&allCampaigns.find((c:any)=>c.id===requestedCampaign))||
    allCampaigns.find((c:any)=>c.status==="active")||
    allCampaigns[0]||
    null

  const campaignId=selectedCampaign?.id||null
  let products:any[]=[]
  if(campaignId){
    const {data}=await db.from("campaign_products").select("*").eq("campaign_id",campaignId).eq("is_active",true).order("title")
    products=data||[]
  }

  const campaignProductIds=new Set(products.map((p:any)=>p.id))
  const campaignItems=(items||[]).filter((i:any)=>{
    if(!campaignId) return false
    if(i.campaign_product_id) return campaignProductIds.has(i.campaign_product_id)
    return false
  })
  const orderIds=new Set(campaignItems.map((i:any)=>i.order_id))
  const campaignOrders=(orders||[]).filter((o:any)=>orderIds.has(o.id))

  const campaignPayouts=(payouts||[]).filter((p:any)=>!campaignId||p.campaign_id===campaignId)
  const {data:payoutRequests}=campaignId?await db.from("payout_requests").select("*").eq("campaign_id",campaignId).order("requested_at",{ascending:false}):{data:[] as any[]}

  const memberRole=memberships?.find((m:any)=>m.organization_id===organizationId)?.role||null
  const canManage=!!platform||memberRole==="owner"||memberRole==="admin"
  const userMap=new Map<string,string>()
  if(canManage){
    let page=1
    for(let i=0;i<10;i++){
      const {data}=await db.auth.admin.listUsers({page,perPage:1000})
      for(const u of data.users) userMap.set(u.id,u.email||u.id)
      if(data.users.length<1000) break
      page++
    }
  }

  return {
    db,user,platform:!!platform,organizationId,org,campaigns:allCampaigns,campaign:selectedCampaign,
    orders:campaignOrders,items:campaignItems,products,payouts:campaignPayouts,payoutRequests:payoutRequests||[],members:members||[],allOrgs:allOrgs||[],
    memberRole,canManage,userMap,lastWebhook:lastWebhook||null
  }
}

export function money(v:number){
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v||0)
}

export function money2(v:number){
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(v||0)
}

export function portalStats(d:any){
  const gross=d.items.reduce((s:number,i:any)=>s+Number(i.unit_price||0)*Number(i.quantity||0),0)
  const refunds=d.items.reduce((s:number,i:any)=>s+Number(i.refunded_merchandise_amount||0),0)
  const eligible=Math.max(0,gross-refunds)
  const raised=d.items.reduce((s:number,i:any)=>s+Number(i.contribution_amount||0)-Number(i.refunded_contribution_amount||0),0)
  const units=d.items.reduce((s:number,i:any)=>s+Number(i.quantity||0),0)
  const avg=d.orders.length?gross/d.orders.length:0
  const awaiting=d.orders.filter((o:any)=>!o.fulfillment_status||o.fulfillment_status==="unfulfilled").length
  const shipped=d.orders.filter((o:any)=>["fulfilled","partial"].includes(o.fulfillment_status)).length
  return {gross,refunds,eligible,raised,units,avg,awaiting,shipped}
}

export function dailySeries(d:any){
  const byDate=new Map<string,{date:string,sales:number,orders:number,items:number,fundraising:number}>()
  for(const o of d.orders){
    const key=o.placed_at?new Date(o.placed_at).toISOString().slice(0,10):"Unknown"
    if(!byDate.has(key)) byDate.set(key,{date:key,sales:0,orders:0,items:0,fundraising:0})
    byDate.get(key)!.orders+=1
  }
  for(const i of d.items){
    const order=d.orders.find((o:any)=>o.id===i.order_id)
    if(!order?.placed_at) continue
    const key=new Date(order.placed_at).toISOString().slice(0,10)
    if(!byDate.has(key)) byDate.set(key,{date:key,sales:0,orders:0,items:0,fundraising:0})
    const row=byDate.get(key)!
    row.sales+=Number(i.unit_price||0)*Number(i.quantity||0)-Number(i.refunded_merchandise_amount||0)
    row.items+=Number(i.quantity||0)
    row.fundraising+=Number(i.contribution_amount||0)-Number(i.refunded_contribution_amount||0)
  }
  return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date))
}
