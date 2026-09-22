import DepartmentPortalSettings from '@/components/portal/DepartmentPortalSettings'
import PayoutPreferences from '@/components/portal/PayoutPreferences'
import AgencyContacts from '@/components/portal/AgencyContacts'
import { inReportingPeriod } from '@/lib/portal/reporting-period'
import DepartmentReporting from '@/components/admin/DepartmentReporting'
import Link from "next/link"
import OrganizationLogoUpload from "@/components/admin/OrganizationLogoUpload"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { DeleteOrganizationButton } from "@/components/admin/OrganizationAdminActions"

export const dynamic = "force-dynamic"

function money(v:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(v||0)}

export default async function OrganizationDetailPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params
  const userDb=await createClient()
  const {data:{user}}=await userDb.auth.getUser()
  if(!user) redirect("/login")

  const db=createAdminClient()
  const {data:organization}=await db.from("organizations").select("id,name,slug,organization_type,contact_name,contact_email,contact_phone,logo_url,website_url,is_active,created_at,reporting_start_date,access_requests_enabled,brand_primary_color").eq("id",id).maybeSingle()
  if(!organization) notFound()

  const [{data:campaigns},{data:orders},{data:payouts},{data:members},{count:pinMemberCount,error:pinMemberError}]=await Promise.all([
    db.from("campaigns").select("id,name,status,goal_amount,starts_at,ends_at").eq("organization_id",id).order("created_at",{ascending:false}),
    db.from("orders").select("id,total,status,placed_at").eq("organization_id",id),
    db.from("payouts").select("id,payout_amount,status").eq("organization_id",id),
    db.from("organization_members").select("id,user_id,role,created_at").eq("organization_id",id),
    db.from("portal_pin_credentials").select("id",{count:"exact",head:true}).eq("organization_id",id)
  ])

  if(pinMemberError) throw pinMemberError
  const gross=(orders||[]).filter((o:any)=>o.status!=="cancelled"&&inReportingPeriod(o.placed_at,organization.reporting_start_date)).reduce((s:number,o:any)=>s+Number(o.total||0),0)
  const payout=(payouts||[]).reduce((s:number,p:any)=>s+Number(p.payout_amount||0),0)

  return <>
    <section className="fc-page-header">
      <div>
        <div className="fc-kicker">DEPARTMENT</div>
        <h1>{organization.name}</h1>
        <p>{organization.organization_type || "Organization"} · {organization.is_active ? "Active" : "Inactive"}</p>
      </div>
      <div className="fc-head-actions">
        <Link href={"/dashboard/organizations/"+id+"/members"} className="fc-btn fc-btn-primary">Manage Access</Link>
        <Link href={"/portal?org="+id} target="_blank" className="fc-btn">Open Department View ↗</Link>
      </div>
    </section>

    <section className="fc-stat-grid">
      <div className="fc-stat-card"><span>Campaigns</span><strong>{campaigns?.length||0}</strong></div>
      <div className="fc-stat-card"><span>Members</span><strong>{(members?.length||0)+(pinMemberCount||0)}</strong></div>
      <div className="fc-stat-card"><span>Gross Sales</span><strong>{money(gross)}</strong></div>
      <div className="fc-stat-card"><span>Payouts</span><strong>{money(payout)}</strong></div>
    </section>

    <section className="fc-card"><h2>Department / station logo</h2><OrganizationLogoUpload organizationId={id} name={organization.name} logoUrl={organization.logo_url} /></section>
    <DepartmentPortalSettings org={organization}/>
    <PayoutPreferences organizationId={id}/>
    <AgencyContacts organizationId={id}/>
    <DepartmentReporting organizationId={id} startDate={organization.reporting_start_date} />
    <section className="fc-dashboard-grid">
      <div className="fc-panel">
        <div className="fc-panel-head"><div><div className="fc-kicker">PROFILE</div><h2>Department Details</h2></div></div>
        <div className="fc-kpi-list">
          <div><span>Type</span><strong>{organization.organization_type||"Organization"}</strong></div>
          <div><span>Contact</span><strong>{organization.contact_name||"—"}</strong></div>
          <div><span>Email</span><strong>{organization.contact_email||"—"}</strong></div>
          <div><span>Phone</span><strong>{organization.contact_phone||"—"}</strong></div>
          <div><span>Website</span><strong>{organization.website_url||"—"}</strong></div>
        </div>
      </div>

      <div className="fc-panel">
        <div className="fc-panel-head"><div><div className="fc-kicker">ACCESS</div><h2>Member Access</h2></div></div>
        <p className="fc-note">Assign people to this department, set their role, and control who can see the department portal.</p>
        <div className="fc-role-grid">
          <div><strong>Owner</strong><span>Full department control</span></div>
          <div><strong>Admin</strong><span>Campaigns, members, reports</span></div>
          <div><strong>Manager</strong><span>Campaign operations</span></div>
          <div><strong>Viewer</strong><span>Read-only reporting</span></div>
        </div>
        <Link href={"/dashboard/organizations/"+id+"/members"} className="fc-btn fc-btn-primary">Manage Members</Link>
      </div>
    </section>

    <section className="fc-card fc-section-gap">
      <div className="fc-card-head"><div><div className="fc-kicker">FUNDRAISING</div><h2>Campaigns</h2></div></div>
      <div className="fc-list-grid">
        {(campaigns||[]).map((c:any)=><Link key={c.id} href={"/dashboard/campaigns/"+c.id} className="fc-list-card">
          <div><span className="fc-kicker">{c.status}</span><h3>{c.name}</h3><p>Goal {money(Number(c.goal_amount||0))}</p></div><span>→</span>
        </Link>)}
      </div>
      {!campaigns?.length&&<div className="fc-empty">No campaigns assigned to this department yet.</div>}
    </section>
    <section className="fc-card fc-section-gap fc-danger-zone">
      <DeleteOrganizationButton organizationId={id} organizationName={organization.name} />
    </section>
  </>
}
