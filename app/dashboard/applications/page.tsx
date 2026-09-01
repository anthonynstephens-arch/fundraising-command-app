import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import ApplicationActions from "@/components/admin/ApplicationActions"

export const dynamic = "force-dynamic"

export default async function ApplicationsPage() {
  const userDb = await createClient()
  const { data: { user } } = await userDb.auth.getUser()
  if (!user) redirect("/login")

  const db = createAdminClient()
  const { data: apps } = await db.from("applications").select("*").order("created_at",{ascending:false})

  return (
    <>
      <section className="fc-page-header">
        <div>
          <div className="fc-kicker">ONBOARDING</div>
          <h1>Applications</h1>
          <p>Review public fundraiser requests and convert approved applicants into organizations.</p>
        </div>
        <a href="/apply" target="_blank" className="fc-button">Public Application ↗</a>
      </section>

      <section className="fc-stack">
        {(apps || []).map((app: any) => (
          <article className="fc-card" key={app.id}>
            <div className="fc-card-head">
              <div>
                <div className="fc-kicker">{app.organization_type || "organization"}</div>
                <h2>{app.organization_name}</h2>
              </div>
              <span className={`fc-pill ${app.status}`}>{app.status}</span>
            </div>

            <div className="fc-detail-grid">
              <div><span>Contact</span><strong>{app.contact_name}</strong></div>
              <div><span>Email</span><strong>{app.contact_email}</strong></div>
              <div><span>Phone</span><strong>{app.contact_phone || "—"}</strong></div>
              <div><span>Campaign</span><strong>{app.requested_campaign_type || "Fundraiser"}</strong></div>
            </div>

            {app.message && <p className="fc-note">{app.message}</p>}
            <ApplicationActions applicationId={app.id} status={app.status} />
          </article>
        ))}
        {!apps?.length && <div className="fc-empty">No pending or historical applications.</div>}
      </section>
    </>
  )
}