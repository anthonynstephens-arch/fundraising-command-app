import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const allowedRoles=["owner","admin","manager","viewer"]

async function access(organizationId:string){
  const auth=await createClient()
  const {data:{user}}=await auth.auth.getUser()
  if(!user) return {ok:false as const,status:401,user:null,platform:false,role:null}
  const db=createAdminClient()
  const [{data:platform},{data:membership}]=await Promise.all([
    db.from("platform_admins").select("role,is_active").eq("user_id",user.id).eq("is_active",true).maybeSingle(),
    db.from("organization_members").select("role").eq("organization_id",organizationId).eq("user_id",user.id).maybeSingle()
  ])
  const platformOk=!!platform
  const orgRole=membership?.role||null
  const ok=platformOk || orgRole==="owner" || orgRole==="admin"
  return {ok,status:ok?200:403,user,platform:platformOk,role:orgRole}
}

async function findUserByEmail(db:any,email:string){
  let page=1
  for(let i=0;i<10;i++){
    const {data,error}=await db.auth.admin.listUsers({page,perPage:1000})
    if(error) throw error
    const match=data.users.find((u:any)=>(u.email||"").toLowerCase()===email.toLowerCase())
    if(match) return match
    if(data.users.length<1000) break
    page++
  }
  return null
}

export async function POST(req:NextRequest){
  try{
    const body=await req.json()
    const organizationId=String(body.organizationId||"")
    const email=String(body.email||"").trim().toLowerCase()
    const role=String(body.role||"viewer")
    const action=String(body.action||"add")
    if(!organizationId||!email||!allowedRoles.includes(role)) return NextResponse.json({error:"Invalid member details."},{status:400})
    const gate=await access(organizationId)
    if(!gate.ok) return NextResponse.json({error:"Not authorized."},{status:gate.status})
    if(role==="owner"&&!gate.platform&&gate.role!=="owner") return NextResponse.json({error:"Only an owner can assign another owner."},{status:403})

    const db=createAdminClient()

    if(action==="resend"){
      const membershipId=String(body.membershipId||"")
      if(!membershipId) return NextResponse.json({error:"Missing membership."},{status:400})
      const {data:membership}=await db.from("organization_members").select("id,user_id,role").eq("id",membershipId).eq("organization_id",organizationId).maybeSingle()
      if(!membership) return NextResponse.json({error:"Membership not found."},{status:404})
      const {data:userData}=await db.auth.admin.getUserById(membership.user_id)
      const oldUser=userData?.user
      if(oldUser?.email_confirmed_at) return NextResponse.json({error:"This member has already activated their account."},{status:400})
      if(oldUser) await db.auth.admin.deleteUser(oldUser.id)
      const {data:inviteData,error:inviteError}=await db.auth.admin.inviteUserByEmail(email,{redirectTo:"https://fundraising-command-app.vercel.app/auth/callback?next=/auth/invite"})
      if(inviteError) return NextResponse.json({error:inviteError.message},{status:400})
      if(!inviteData.user) return NextResponse.json({error:"Unable to resend invitation."},{status:400})
      const {error:updateError}=await db.from("organization_members").update({user_id:inviteData.user.id}).eq("id",membershipId).eq("organization_id",organizationId)
      if(updateError) return NextResponse.json({error:updateError.message},{status:400})
      return NextResponse.json({ok:true,invited:true,userId:inviteData.user.id})
    }

    let authUser=await findUserByEmail(db,email)
    let invited=false
    if(!authUser){
      const {data,error}=await db.auth.admin.inviteUserByEmail(email,{redirectTo:"https://fundraising-command-app.vercel.app/auth/callback?next=/auth/invite"})
      if(error) return NextResponse.json({error:error.message},{status:400})
      authUser=data.user
      invited=true
    }
    if(!authUser) return NextResponse.json({error:"Unable to create user access."},{status:400})

    const {data,error}=await db.from("organization_members")
      .upsert({organization_id:organizationId,user_id:authUser.id,role},{onConflict:"organization_id,user_id"})
      .select("id,user_id,role,created_at").single()
    if(error) return NextResponse.json({error:error.message},{status:400})
    return NextResponse.json({member:data,email:authUser.email,invited})
  }catch(e:any){return NextResponse.json({error:e?.message||"Unable to add member."},{status:500})}
}

export async function PATCH(req:NextRequest){
  try{
    const body=await req.json()
    const organizationId=String(body.organizationId||"")
    const membershipId=String(body.membershipId||"")
    const role=String(body.role||"")
    if(!organizationId||!membershipId||!allowedRoles.includes(role)) return NextResponse.json({error:"Invalid role update."},{status:400})
    const gate=await access(organizationId)
    if(!gate.ok) return NextResponse.json({error:"Not authorized."},{status:gate.status})
    if(role==="owner"&&!gate.platform&&gate.role!=="owner") return NextResponse.json({error:"Only an owner can assign another owner."},{status:403})
    const db=createAdminClient()
    const {error}=await db.from("organization_members").update({role}).eq("id",membershipId).eq("organization_id",organizationId)
    if(error) return NextResponse.json({error:error.message},{status:400})
    return NextResponse.json({ok:true})
  }catch(e:any){return NextResponse.json({error:e?.message||"Unable to update member."},{status:500})}
}

export async function DELETE(req:NextRequest){
  try{
    const body=await req.json()
    const organizationId=String(body.organizationId||"")
    const membershipId=String(body.membershipId||"")
    if(!organizationId||!membershipId) return NextResponse.json({error:"Invalid member."},{status:400})
    const gate=await access(organizationId)
    if(!gate.ok) return NextResponse.json({error:"Not authorized."},{status:gate.status})
    const db=createAdminClient()
    const {error}=await db.from("organization_members").delete().eq("id",membershipId).eq("organization_id",organizationId)
    if(error) return NextResponse.json({error:error.message},{status:400})
    return NextResponse.json({ok:true})
  }catch(e:any){return NextResponse.json({error:e?.message||"Unable to remove member."},{status:500})}
}