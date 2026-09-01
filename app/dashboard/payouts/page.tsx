import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

function money(v: unknown) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v || 0))
}

function date(v: string | null) {
  if (!v) return "—"
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(v))
}

export default async function PayoutsPage() {
  const userDb = await createClient()
  const { data: { user } } = await userDb.auth.getUser()
  if (!user) redirect("/login")

  const db = createAdminClient()
  const { data: payouts } = await db
    .from("payouts")
    .select(`
      id,status,period_start,period_end,gross_sales,contribution_amount,adjustment_amount,payout_amount,paid_at,created_at,
      organization:organizations(name),
      campaign:campaigns(name)
    `)
    .order("created_at", { ascending: false })

  const pending = (payouts || []).filter((p: any) => ["pending","approved","processing"].includes(p.status))
  const paid = (payouts || []).filter((p: any) => p.status === "paid")
  const pendingAmount = pending.reduce((s: number, p: any) => s + Number(p.payout_amount || 0), 0)
  const paidAmount = paid.reduce((s: number, p: any) => s + Number(p.payout_amount || 0), 0)

  return (
    <>
      <section className="fc-page-header">
        <div>
          <div className="fc-kicker">FINANCE</div>
          <h1>Payouts</h1>
          <p>Track fundraiser contributions from pending calculation through completed payout.</p>
        </div>
      </section>

      <section className="fc-metrics">
        <div className="fc-metric"><span>Payout Records</span><strong>{payouts?.length || 0}</strong></div>
        <div className="fc-metric"><span>Pending</span><strong>{money(pendingAmount)}</strong></div>
        <div className="fc-metric"><span>Paid</span><strong>{money(paidAmount)}</strong></div>
        <div className="fc-metric"><span>In Progress</span><strong>{pending.length}</strong></div>
      </section>

      <section className="fc-card">
        <div className="fc-card-head">
          <div><div className="fc-kicker">PAYOUT LEDGER</div><h2>All Payouts</h2></div>
        </div>
        {payouts?.length ? (
          <div className="fc-table-scroll">
            <table className="fc-table">
              <thead>
                <tr><th>Organization</th><th>Campaign</th><th>Status</th><th>Sales</th><th>Contribution</th><th>Adjustment</th><th>Payout</th><th>Created</th><th></th></tr>
              </thead>
              <tbody>
                {payouts.map((p: any) => {
                  const org = Array.isArray(p.organization) ? p.organization[0] : p.organization
                  const campaign = Array.isArray(p.campaign) ? p.campaign[0] : p.campaign
                  return (
                    <tr key={p.id}>
                      <td>{org?.name || "—"}</td>
                      <td>{campaign?.name || "—"}</td>
                      <td><span className={`fc-pill ${p.status}`}>{p.status}</span></td>
                      <td>{money(p.gross_sales)}</td>
                      <td>{money(p.contribution_amount)}</td>
                      <td>{money(p.adjustment_amount)}</td>
                      <td><strong>{money(p.payout_amount)}</strong></td>
                      <td>{date(p.created_at)}</td><td><Link className="fc-row-link" href={`/dashboard/payouts/${p.id}`}>View →</Link></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="fc-empty">No payouts have been generated.</div>}
      </section>
    </>
  )
}