import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export default async function OrganizationsPage() {
  const userDb = await createClient()
  const { data: { user } } = await userDb.auth.getUser()
  if (!user) redirect("/login")

  const db = createAdminClient()
  const { data: orgs } = await db.from("organizations").select("id,name,slug,organization_type,is_active,created_at").order("name")

  return (
    <>
      <section className="fc-page-header">
        <div>
          <div className="fc-kicker">TENANTS</div>
          <h1>Organizations</h1>
          <p>Departments, agencies, schools and organizations using Fundraising Command.</p>
        </div>
      </section>

      <section className="fc-card">
        <div className="fc-card-head">
          <div><div className="fc-kicker">DIRECTORY</div><h2>Organizations</h2></div>
          <span className="fc-count">{orgs?.length || 0}</span>
        </div>

        <div className="fc-list-grid">
          {(orgs || []).map((org: any) => (
            <Link href={`/dashboard/organizations/${org.id}`} className="fc-list-card" key={org.id}>
              <div>
                <span className="fc-kicker">{org.organization_type || "organization"}</span>
                <h3>{org.name}</h3>
                <p>{org.slug}</p>
              </div>
              <div className="fc-list-card-right">
                <span className={`fc-pill ${org.is_active ? "active" : "inactive"}`}>{org.is_active ? "Active" : "Inactive"}</span>
                <span>→</span>
              </div>
            </Link>
          ))}
        </div>

        {!orgs?.length && <div className="fc-empty">No organizations yet.</div>}
      </section>
    </>
  )
}