import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function gate(campaignId:string,organizationId:string){
  const auth=await createClient()
  const {data:{user}}=await auth.auth.getUser()
  if(!user) return {ok:false as const,status:401,user:null}
  const db=createAdminClient()
  const [{data:platform},{data:member},{data:campaign}]=await Promise.all([
    db.from("platform_admins").select("role").eq("user_id",user.id).eq("is_active",true).maybeSingle(),
    db.from("organization_members").select("role").eq("organization_id",organizationId).eq("user_id",user.id).maybeSingle(),
    db.from("campaigns").select("id").eq("id",campaignId).eq("organization_id",organizationId).maybeSingle()
  ])
  if(!campaign) return {ok:false as const,status:404,user:null}
  if(!platform&&!member) return {ok:false as const,status:403,user:null}
  return {ok:true as const,status:200,user}
}

export async function GET(req:Request){
  const u=new URL(req.url)
  const campaignId=u.searchParams.get("campaignId")||""
  const organizationId=u.searchParams.get("organizationId")||""
  const g=await gate(campaignId,organizationId)
  if(!g.ok) return NextResponse.json({error:"Unauthorized"},{status:g.status})
  const db=createAdminClient()
  const [{data:links},{data:activity},{data:templates}]=await Promise.all([
    db.from("marketing_tracking_links").select("id,channel,code,target_url,created_at").eq("campaign_id",campaignId).order("channel"),
    db.from("marketing_activity").select("id,action,label,created_at,metadata").eq("campaign_id",campaignId).order("created_at",{ascending:false}).limit(20),
    db.from("marketing_templates").select("id,name,kind,content,created_at,updated_at").eq("campaign_id",campaignId).order("updated_at",{ascending:false})
  ])
  const clickRows=links?.length?await db.from("marketing_clicks").select("tracking_link_id").eq("campaign_id",campaignId):{data:[] as any[]}
  const counts=new Map<string,number>()
  for(const c of clickRows.data||[]) counts.set(c.tracking_link_id,(counts.get(c.tracking_link_id)||0)+1)
  return NextResponse.json({
    links:(links||[]).map((l:any)=>({...l,clicks:counts.get(l.id)||0,share_url:"https://fundraising-command-app.vercel.app/m/"+l.code})),
    activity:activity||[],templates:templates||[]
  })
}

export async function POST(req:Request){
  const body=await req.json()
  const campaignId=String(body.campaignId||"")
  const organizationId=String(body.organizationId||"")
  const g=await gate(campaignId,organizationId)
  if(!g.ok) return NextResponse.json({error:"Unauthorized"},{status:g.status})
  const db=createAdminClient()
  const action=String(body.action||"")

  if(action==="tracking_link"){
    const channel=String(body.channel||"").trim().toLowerCase().slice(0,60)
    const targetUrl=String(body.targetUrl||"").trim()
    const {data:existing}=await db.from("marketing_tracking_links").select("*").eq("campaign_id",campaignId).eq("channel",channel).maybeSingle()
    if(existing) return NextResponse.json({ok:true,link:{...existing,share_url:"https://fundraising-command-app.vercel.app/m/"+existing.code}})
    const code=(globalThis.crypto?.randomUUID?.()||String(Date.now())).replaceAll("-","").slice(0,12)
    const {data,error}=await db.from("marketing_tracking_links").insert({campaign_id:campaignId,organization_id:organizationId,channel,code,target_url:targetUrl,created_by:g.user!.id}).select("*").single()
    if(error) return NextResponse.json({error:error.message},{status:500})
    return NextResponse.json({ok:true,link:{...data,share_url:"https://fundraising-command-app.vercel.app/m/"+data.code}})
  }

  if(action==="activity"){
    const {error}=await db.from("marketing_activity").insert({organization_id:organizationId,campaign_id:campaignId,user_id:g.user!.id,action:String(body.event||"activity").slice(0,80),label:String(body.label||"").slice(0,180),metadata:body.metadata||{}})
    if(error) return NextResponse.json({error:error.message},{status:500})
    return NextResponse.json({ok:true})
  }

  if(action==="save_template"){
    const name=String(body.name||"").trim().slice(0,100)
    const kind=String(body.kind||"social").trim().slice(0,30)
    const content=String(body.content||"").trim().slice(0,8000)
    if(!name||!content) return NextResponse.json({error:"Template name and content are required."},{status:400})
    const {data,error}=await db.from("marketing_templates").insert({organization_id:organizationId,campaign_id:campaignId,user_id:g.user!.id,name,kind,content}).select("*").single()
    if(error) return NextResponse.json({error:error.message},{status:500})
    return NextResponse.json({ok:true,template:data})
  }

  if(action==="delete_template"){
    const {error}=await db.from("marketing_templates").delete().eq("id",String(body.id||"")).eq("campaign_id",campaignId)
    if(error) return NextResponse.json({error:error.message},{status:500})
    return NextResponse.json({ok:true})
  }
  return NextResponse.json({error:"Unknown action"},{status:400})
}
