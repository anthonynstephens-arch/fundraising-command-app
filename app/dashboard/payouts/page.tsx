import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import PayoutRequestActions from "@/components/admin/PayoutRequestActions"

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
  const [{ data: payouts }, { data: requests }] = await Promise.all([
    db.from("payouts").select(`
      id,status,period_start,period_end,gross_sales,contribution_amount,adjustment_amount,payout_amount,paid_at,created_at,
      organization:organizations(name),
      campaign:campaigns(name)
    `).order("created_at", { ascending: false }),
    db.from("payout_requests").select(`
      id,status,requested_amount,requested_at,reviewed_at,note,admin_note,payout_id,
      organization:organizations(name),
      campaign:campaigns(name)
    `).order("requested_at", { ascending: false })
  ])

  const pending = (payouts || []).filter((p: any) => ["pending","approved","processing"].includes(p.status))
  const paid = (payouts || []).filter((p: any) => p.status === "paid")
  const openRequests = (requests || []).filter((r:any)=>["requested","approved","processing"].includes(r.status))
  const pendingAmount = pending.reduce((s: number, p: any) => s + Number(p.payout_amount || 0), 0)
  const paidAmount = paid.reduce((s: number, p: any) => s + Number(p.payout_amount || 0), 0)

  return (
    <>
      <section className="fc-page-header">
        <div>
          <div className="fc-kicker">FINANCE</div>
          <h1>Payouts</h1>
          <p>Review department payout requests, generate reconciled payout records, and track payment through completion.</p>
        </div>
      </section>

      <section className="fc-metrics">
        <div className="fc-metric"><span>Open Requests</span><strong>{openRequests.length}</strong></div>
        <div className="fc-metric"><span>Pending Payouts</span><strong>{money(pendingAmount)}</strong></div>
        <div className="fc-metric"><span>Paid</span><strong>{money(paidAmount)}</strong></div>
        <div className="fc-metric"><span>Payout Records</span><strong>{payouts?.length || 0}</strong></div>
      </section>

      <section className="fc-card">
        <div className="fc-card-head">
          <div><div className="fc-kicker">DEPARTMENT REQUESTS</div><h2>Payout Requests</h2></div>
          <span className="fc-count">{requests?.length || 0}</span>
        </div>
        {requests?.length ? (
          <div className="fc-table-scroll">
            <table className="fc-table">
              <thead><tr><th>Organization</th><th>Campaign</th><th>Requested</th><th>Amount</th><th>Status</th><th>Note</th><th>Actions</th></tr></thead>
              <tbody>{requests.map((r:any)=>{
                const org = Array.isArray(r.organization) ? r.organization[0] : r.organization
                const campaign = Array.isArray(r.campaign) ? r.campaign[0] : r.campaign
                return <tr key={r.id}>
                  <td>{org?.name||"—"}</td><td>{campaign?.name||"—"}</td><td>{date(r.requested_at)}</td><td><strong>{money(r.requested_amount)}</strong></td>
                  <td><span className={`fc-pill ${r.status}`}>{r.status}</span></td><td>{r.admin_note||r.note||"—"}</td>
                  <td><PayoutRequestActions requestId={r.id} status={r.status}/></td>
                </tr>
              })}</tbody>
            </table>
          </div>
        ) : <div className="fc-empty">No payout requests yet.</div>}
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