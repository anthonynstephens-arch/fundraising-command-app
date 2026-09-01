import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

function money(v: unknown) {
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(v || 0))
}

export default async function CampaignsPage() {
  const userDb = await createClient()
  const { data: { user } } = await userDb.auth.getUser()
  if (!user) redirect("/login")

  const db = createAdminClient()
  const { data: campaigns } = await db
    .from("campaigns")
    .select("id,name,slug,campaign_type,status,goal_amount,starts_at,ends_at,organization:organizations(name)")
    .order("created_at",{ascending:false})

  return (
    <>
      <section className="fc-page-header">
        <div>
          <div className="fc-kicker">FUNDRAISING</div>
          <h1>Campaigns</h1>
          <p>Manage campaign storefronts, contribution rules, goals and public presentation.</p>
        </div>
        <Link href="/dashboard/campaigns/new" className="fc-button primary">New Campaign</Link>
      </section>

      <section className="fc-card">
        <div className="fc-card-head">
          <div><div className="fc-kicker">CAMPAIGN DIRECTORY</div><h2>All Campaigns</h2></div>
          <span className="fc-count">{campaigns?.length || 0}</span>
        </div>

        <div className="fc-list-grid">
          {(campaigns || []).map((c: any) => {
            const org = Array.isArray(c.organization) ? c.organization[0] : c.organization
            return (
              <Link href={`/dashboard/campaigns/${c.id}`} className="fc-list-card" key={c.id}>
                <div>
                  <span className="fc-kicker">{org?.name || "Campaign"}</span>
                  <h3>{c.name}</h3>
                  <p>{c.campaign_type || "fundraiser"} · Goal {money(c.goal_amount)}</p>
                </div>
                <div className="fc-list-card-right">
                  <span className={`fc-pill ${c.status}`}>{c.status}</span>
                  <span>→</span>
                </div>
              </Link>
            )
          })}
        </div>

        {!campaigns?.length && <div className="fc-empty">No campaigns yet.</div>}
      </section>
    </>
  )
}