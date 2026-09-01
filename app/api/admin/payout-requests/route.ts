import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin"

export async function PATCH(request:Request){
  const auth=await requirePlatformAdmin()
  if(!auth.ok) return NextResponse.json({error:"Unauthorized"},{status:auth.status})
  const {requestId,action,adminNote,paymentReference}=await request.json()
  if(!requestId||!action) return NextResponse.json({error:"Missing request ID or action"},{status:400})

  const db=createAdminClient()
  const {data:req}=await db.from("payout_requests").select("*").eq("id",requestId).maybeSingle()
  if(!req) return NextResponse.json({error:"Payout request not found"},{status:404})

  if(action==="approve"){
    if(req.status!=="requested") return NextResponse.json({error:"Only requested payouts can be approved."},{status:400})
    const {data,error}=await db.rpc("generate_campaign_payout",{target_campaign:req.campaign_id})
    if(error) return NextResponse.json({error:error.message},{status:500})
    const payout=Array.isArray(data)?data[0]:data
    if(!payout) return NextResponse.json({error:"No unpaid campaign order items are available."},{status:400})
    const {data:updated,error:updateError}=await db.from("payout_requests").update({
      status:"approved",
      payout_id:payout.payout_id,
      requested_amount:Number(payout.payout_amount||req.requested_amount),
      reviewed_at:new Date().toISOString(),
      reviewed_by:auth.user?.id||null,
      admin_note:adminNote||null
    }).eq("id",requestId).select("*").single()
    if(updateError) return NextResponse.json({error:updateError.message},{status:500})
    return NextResponse.json({ok:true,request:updated,payoutId:payout.payout_id})
  }

  if(action==="reject"){
    const {data,error}=await db.from("payout_requests").update({
      status:"rejected",reviewed_at:new Date().toISOString(),reviewed_by:auth.user?.id||null,admin_note:adminNote||null
    }).eq("id",requestId).select("*").single()
    if(error) return NextResponse.json({error:error.message},{status:500})
    return NextResponse.json({ok:true,request:data})
  }

  if(action==="processing"){
    if(!req.payout_id) return NextResponse.json({error:"This request has no payout record yet."},{status:400})
    const {error:payoutError}=await db.from("payouts").update({status:"processing"}).eq("id",req.payout_id)
    if(payoutError) return NextResponse.json({error:payoutError.message},{status:500})
    const {data,error}=await db.from("payout_requests").update({status:"processing",admin_note:adminNote||req.admin_note}).eq("id",requestId).select("*").single()
    if(error) return NextResponse.json({error:error.message},{status:500})
    return NextResponse.json({ok:true,request:data})
  }

  if(action==="paid"){
    if(!req.payout_id) return NextResponse.json({error:"This request has no payout record yet."},{status:400})
    const now=new Date().toISOString()
    const {error:payoutError}=await db.from("payouts").update({status:"paid",paid_at:now,payment_reference:paymentReference||null}).eq("id",req.payout_id)
    if(payoutError) return NextResponse.json({error:payoutError.message},{status:500})
    const {data,error}=await db.from("payout_requests").update({status:"paid",paid_at:now,admin_note:adminNote||req.admin_note}).eq("id",requestId).select("*").single()
    if(error) return NextResponse.json({error:error.message},{status:500})
    return NextResponse.json({ok:true,request:data})
  }

  return NextResponse.json({error:"Unknown action"},{status:400})
}
