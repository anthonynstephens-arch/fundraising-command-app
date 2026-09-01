import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request:Request){
  const userDb=await createClient()
  const {data:{user}}=await userDb.auth.getUser()
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401})

  const {organizationId,campaignId,note}=await request.json()
  if(!organizationId||!campaignId) return NextResponse.json({error:"Missing organization or campaign"},{status:400})

  const db=createAdminClient()
  const [{data:platform},{data:membership},{data:campaign}]=await Promise.all([
    db.from("platform_admins").select("role").eq("user_id",user.id).eq("is_active",true).maybeSingle(),
    db.from("organization_members").select("role").eq("organization_id",organizationId).eq("user_id",user.id).maybeSingle(),
    db.from("campaigns").select("id,organization_id,status,min_payout_threshold").eq("id",campaignId).eq("organization_id",organizationId).maybeSingle()
  ])
  if(!campaign) return NextResponse.json({error:"Campaign not found"},{status:404})
  const canRequest=!!platform||["owner","admin"].includes(membership?.role||"")
  if(!canRequest) return NextResponse.json({error:"Only organization Owners and Admins can request payouts."},{status:403})

  const {data:open}=await db.from("payout_requests").select("id,status,requested_amount").eq("campaign_id",campaignId).in("status",["requested","approved","processing"]).maybeSingle()
  if(open) return NextResponse.json({error:"A payout request is already open for this campaign.",request:open},{status:409})

  const {data:products}=await db.from("campaign_products").select("id").eq("campaign_id",campaignId).eq("is_active",true)
  const productIds=(products||[]).map((p:any)=>p.id)
  if(!productIds.length) return NextResponse.json({error:"No campaign products are available for payout."},{status:400})

  const {data:items}=await db.from("order_items").select("id,contribution_amount,refunded_contribution_amount").in("campaign_product_id",productIds)
  const itemIds=(items||[]).map((i:any)=>i.id)
  const paidOrReserved=new Set<string>()
  if(itemIds.length){
    const {data:used}=await db.from("payout_items").select("order_item_id,payout:payouts(status)").in("order_item_id",itemIds)
    for(const row of used||[]){
      const p=Array.isArray((row as any).payout)?(row as any).payout[0]:(row as any).payout
      if(p&&p.status!=="cancelled"&&(row as any).order_item_id) paidOrReserved.add((row as any).order_item_id)
    }
  }
  const available=(items||[]).filter((i:any)=>!paidOrReserved.has(i.id)).reduce((s:number,i:any)=>s+Number(i.contribution_amount||0)-Number(i.refunded_contribution_amount||0),0)
  if(available<=0) return NextResponse.json({error:"There are no unpaid fundraising proceeds available."},{status:400})

  const threshold=Number(campaign.min_payout_threshold||0)
  if(available<threshold&&campaign.status!=="completed"){
    return NextResponse.json({error:"Available proceeds are $"+available.toFixed(2)+". The campaign minimum payout threshold is $"+threshold.toFixed(2)+".",available,threshold},{status:400})
  }

  const {data:created,error}=await db.from("payout_requests").insert({
    organization_id:organizationId,campaign_id:campaignId,requested_by:user.id,requested_amount:available,status:"requested",note:typeof note==="string"?note.slice(0,1000):null
  }).select("*").single()
  if(error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({ok:true,request:created})
}
