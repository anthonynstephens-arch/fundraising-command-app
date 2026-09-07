import Link from "next/link"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import OrganizationMemberManager from "@/components/admin/OrganizationMemberManager"
import PinAccessManager from "@/components/admin/PinAccessManager"

export const dynamic="force-dynamic"

export default async function MembersPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const db=createAdminClient()
  const {data:organization}=await db.from("organizations").select("id,name,organization_type").eq("id",id).maybeSingle()
  if(!organization) notFound()

  const [{data:members},{data:pinCredentials}]=await Promise.all([
    db.from("organization_members").select("id,user_id,role,created_at").eq("organization_id",id).order("created_at"),
    db.from("portal_pin_credentials").select("id,display_name,role,active,created_at").eq("organization_id",id).order("created_at")
  ])
  const users=new Map<string,string>()
  let page=1
  for(let i=0;i<10;i++){
    const {data}=await db.auth.admin.listUsers({page,perPage:1000})
    for(const u of data.users) users.set(u.id,u.email||u.id)
    if(data.users.length<1000) break
    page++
  }
  const rows=(members||[]).map((m:any)=>({...m,email:users.get(m.user_id)||null}))
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

  return <>
    <section className="fc-page-header">
      <div>
        <div className="fc-kicker">DEPARTMENT ACCESS</div>
        <h1>Members</h1>
        <p>{organization.name} · Assign people and decide what they can do.</p>
      </div>
      <div className="fc-head-actions">
        <Link href={"/dashboard/organizations/"+id} className="fc-btn">Back to Department</Link>
        <Link href={"/portal?org="+id} target="_blank" className="fc-btn">Preview Portal ↗</Link>
      </div>
    </section>

    <section className="fc-card">
      <div className="fc-card-head"><div><div className="fc-kicker">ACCESS CONTROL</div><h2>Department Users</h2></div><span className="fc-count">{rows.length}</span></div>
      <OrganizationMemberManager organizationId={id} members={rows}/>
    </section>
    <section className="fc-card">
      <div className="fc-card-head"><div><div className="fc-kicker">QUICK ACCESS</div><h2>PIN Logins</h2><p>Create department portal access without requiring an email account.</p></div><span className="fc-count">{pins.length}</span></div>
      <PinAccessManager organizationId={id} credentials={pins}/>
    </section>
  </>
}
