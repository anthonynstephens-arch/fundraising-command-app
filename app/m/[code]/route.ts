import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(req:Request,{params}:{params:Promise<{code:string}>}){
  const {code}=await params
  const db=createAdminClient()
  const {data:link}=await db.from("marketing_tracking_links").select("id,campaign_id,channel,target_url").eq("code",code).maybeSingle()
  if(!link) return NextResponse.redirect(new URL("/",req.url))
  await db.from("marketing_clicks").insert({
    tracking_link_id:link.id,
    campaign_id:link.campaign_id,
    channel:link.channel,
    user_agent:req.headers.get("user-agent")||null
  })
  return NextResponse.redirect(link.target_url)
}
