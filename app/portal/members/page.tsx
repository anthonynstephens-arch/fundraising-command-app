import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPortalPinSession } from "@/lib/pin-auth"
import OrganizationMemberManager from "@/components/admin/OrganizationMemberManager"
import PinAccessManager from "@/components/admin/PinAccessManager"

export const dynamic="force-dynamic"

export default async function PortalMembers({searchParams}:{searchParams:Promise<{org?:string}>}){
  const {org}=await searchParams
  const auth=await createClient()
  const [{data:{user}},pinSession]=await Promise.all([auth.auth.getUser(),getPortalPinSession()])
  if(!user&&!pinSession) redirect("/login")

  const db=createAdminClient()
  const [{data:platform},{data:memberships}]=await Promise.all([
    user?db.from("platform_admins").select("role").eq("user_id",user.id).eq("is_active",true).maybeSingle():Promise.resolve({data:null}),
    user?db.from("organization_members").select("organization_id,role").eq("user_id",user.id):Promise.resolve({data:[] as any[]})
  ])

  const organizationId=org||pinSession?.organizationId||memberships?.[0]?.organization_id
  if(!organizationId) redirect("/portal")

  const own=memberships?.find((m:any)=>m.organization_id===organizationId)
  const pinRole=pinSession&&pinSession.organizationId===organizationId?pinSession.role:null
  const role=own?.role||pinRole
  const canManage=!!platform||role==="owner"||role==="admin"||role==="manager"
  if(!canManage) redirect("/portal?org="+organizationId)

  const {data:organization}=await db.from("organizations").select("id,name,slug,organization_type").eq("id",organizationId).maybeSingle()
  if(!organization) redirect("/portal")

  const [{data:members},{data:pinCredentials}]=await Promise.all([
    db.from("organization_members").select("id,user_id,role,created_at").eq("organization_id",organizationId).order("created_at"),
    db.from("portal_pin_credentials").select("id,display_name,email,access_status,role,active,created_at").eq("organization_id",organizationId).order("created_at")
  ])

  const users=new Map<string,{email:string;confirmed:boolean}>()
  let page=1
  for(let i=0;i<10;i++){
    const {data}=await db.auth.admin.listUsers({page,perPage:1000})
    for(const u of data.users) users.set(u.id,{email:u.email||u.id,confirmed:!!u.email_confirmed_at})
    if(data.users.length<1000) break
    page++
  }

  const rows=(members||[]).map((m:any)=>{const u=users.get(m.user_id);return {...m,email:u?.email||null,confirmed:!!u?.confirmed}})
  const pinIds=(pinCredentials||[]).map((credential:any)=>credential.id)
  const {data:pinEvents}=pinIds.length
    ?await db.from("portal_pin_login_events").select("credential_id,logged_in_at").in("credential_id",pinIds).order("logged_in_at",{ascending:false})
    :{data:[] as any[]}
  const pinStats=new Map<string,{loginCount:number;lastLogin:string|null}>()
  for(const event of pinEvents||[]){
    const current=pinStats.get(event.credential_id)||{loginCount:0,lastLogin:null}
    current.loginCount+=1
    current.lastLogin||=event.logged_in_at
    pinStats.set(event.credential_id,current)
  }
  const pins=(pinCredentials||[]).map((credential:any)=>({...credential,...(pinStats.get(credential.id)||{loginCount:0,lastLogin:null})}))

  return <div className={"portal-page"+(organization.slug==="macac"?" macac-theme":"")}>
    <div className="portal-page-top">
      <div>
        <div className="portal-kicker">MEMBER ACCESS</div>
        <h1>{organization.name}</h1>
        <p>Add department users and control exactly what each role can do.</p>
      </div>
      <Link href={organization.organization_type === "detroit_fire_station" ? "/station/"+organizationId : "/portal?org="+organizationId} className="portal-secondary">Back to Overview</Link>
    </div>

    <div className="portal-card">
      <div className="portal-card-head">
        <div><span>ACCESS CONTROL</span><h2>Department Members</h2></div>
        <strong>{rows.length}</strong>
      </div>
      <OrganizationMemberManager organizationId={organizationId} members={rows}/>
    </div>

    <div className="portal-card">
      <div className="portal-card-head">
        <div><span>QUICK ACCESS</span><h2>PIN Members</h2><p>Approve requested access or create a department PIN.</p></div>
        <strong>{pins.length}</strong>
      </div>
      <PinAccessManager organizationId={organizationId} credentials={pins} canApprove={!!platform||role==="owner"||role==="admin"}/>
    </div>
  </div>
}
