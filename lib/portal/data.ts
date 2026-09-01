import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function getPortalData(requestedOrg?:string){
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

  const [{data:org},{data:campaigns},{data:orders},{data:items},{data:payouts},{data:members},{data:allOrgs}]=await Promise.all([
    db.from("organizations").select("*").eq("id",organizationId).maybeSingle(),
    db.from("campaigns").select("*").eq("organization_id",organizationId).order("created_at",{ascending:false}),
    db.from("orders").select("*").eq("organization_id",organizationId).order("placed_at",{ascending:false}),
    db.from("order_items").select("*"),
    db.from("payouts").select("*").eq("organization_id",organizationId).order("created_at",{ascending:false}),
    db.from("organization_members").select("*").eq("organization_id",organizationId).order("created_at"),
    platform?db.from("organizations").select("id,name").eq("is_active",true).order("name"):Promise.resolve({data:[] as any[]})
  ])
  if(!org) redirect("/apply")

  const activeCampaign=(campaigns||[]).find((c:any)=>c.status==="active")||(campaigns||[])[0]||null
  const campaignId=activeCampaign?.id||null
  const campaignOrders=(orders||[]).filter((o:any)=>!campaignId||o.campaign_id===campaignId||o.campaign_id===null)
  const orderIds=new Set(campaignOrders.map((o:any)=>o.id))
  const campaignItems=(items||[]).filter((i:any)=>orderIds.has(i.order_id))

  let products:any[]=[]
  if(campaignId){
    const {data}=await db.from("campaign_products").select("*").eq("campaign_id",campaignId).eq("is_active",true).order("title")
    products=data||[]
  }

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
    db,user,platform:!!platform,organizationId,org,campaigns:campaigns||[],campaign:activeCampaign,
    orders:campaignOrders,items:campaignItems,products,payouts:payouts||[],members:members||[],allOrgs:allOrgs||[],
    memberRole,canManage,userMap
  }
}

export function money(v:number){
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v||0)
}

export function portalStats(d:any){
  const gross=d.items.reduce((s:number,i:any)=>s+Number(i.unit_price||0)*Number(i.quantity||0),0)
  const refund=d.items.reduce((s:number,i:any)=>s+Number(i.refunded_merchandise_amount||0),0)
  const eligible=Math.max(0,gross-refund)
  const raised=d.items.reduce((s:number,i:any)=>s+Number(i.contribution_amount||0)-Number(i.refunded_contribution_amount||0),0)
  const units=d.items.reduce((s:number,i:any)=>s+Number(i.quantity||0),0)
  const avg=d.orders.length?gross/d.orders.length:0
  const awaiting=d.orders.filter((o:any)=>!o.fulfillment_status||o.fulfillment_status==="unfulfilled").length
  const shipped=d.orders.filter((o:any)=>["fulfilled","partial"].includes(o.fulfillment_status)).length
  return {gross,refund,eligible,raised,units,avg,awaiting,shipped}
}
