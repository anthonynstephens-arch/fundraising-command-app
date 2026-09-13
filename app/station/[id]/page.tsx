import Link from 'next/link'
import { stationAccess, stationCollections } from '@/lib/stations/data'
import StationCashOut from '@/components/stations/StationCashOut'
import '../station.css'
export const dynamic = 'force-dynamic'
const money = (v: unknown) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v || 0))
export default async function Station({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const d = await stationAccess(id)
  const collections = await stationCollections(d.db, id)
  const { data: history, error } = await d.db.from('payout_requests').select('id,status,requested_amount,requested_at,admin_note,paid_at').eq('organization_id', id).order('requested_at', { ascending: false })
  if (error) throw error
  const sum = (key: string) => collections.reduce((a, c) => a + Number(c[key] || 0), 0)
  const color = /^#[0-9a-f]{6}$/i.test(d.station.brand_primary_color || '') ? d.station.brand_primary_color : '#cf4538'
  return <main className="station-app" style={{ '--station-color': color } as React.CSSProperties}>
    <nav><Link href="/station">← Stations</Link>{d.admin && <Link href="/dashboard/stations">Admin console →</Link>}</nav>
    <header className="station-header">{d.station.logo_url && <img src={d.station.logo_url} alt={d.station.name + ' logo'} />}<div><p className="station-eyebrow">DETROIT FIRE DEPARTMENT · STATION FUND</p><h1>{d.station.name}</h1><p>{d.station.brand_name_short || 'Built by your house. Backed by your community.'}</p></div></header>
    <section className="station-metrics">{[['Collection sales', sum('gross_sales')], ['Station earnings', sum('earned')], ['Available', sum('available')], ['Pending approval / payment', sum('pending')], ['Paid to station', sum('paid')]].map(([label, value]) => <div key={String(label)}><span>{label}</span><strong>{money(value)}</strong></div>)}</section>
    <section className="station-section-head"><div><h2>Your collections</h2><p>Cash out each collection once its available earnings reach $100. Every request requires approval.</p></div></section>
    <div className="station-grid">{collections.map(c => { const goal = Number(c.goal_amount || 0); return <article className="station-card" key={c.id}><span className="station-eyebrow">{c.status}</span><h2>{c.name}</h2><strong className="station-amount">{money(c.earned)}</strong><p>earned for your station</p>{goal > 0 && <><progress max={goal} value={Math.max(0, Number(c.earned))} /><p>{money(c.earned)} of {money(goal)} goal</p></>}<div className="station-detail"><span>Available <b>{money(c.available)}</b></span><span>Pending <b>{money(c.pending)}</b></span><span>Paid <b>{money(c.paid)}</b></span></div><StationCashOut campaignId={c.id} available={Number(c.available)} canRequest={d.canRequest} open={c.has_open_request} /><Link href={'/portal/progress?org=' + id + '&campaign=' + c.id}>View collection details →</Link></article> })}</div>
    {!collections.length && <div className="station-card"><h2>Your first collection is coming</h2><p>No collections are assigned to this station yet. Your administrator can connect one in Fundraiser Command.</p></div>}
    <section className="station-card"><h2>Payout history</h2><p>Approval is not payment. Paid requests show the date funds were recorded as sent.</p><div className="station-table"><table><thead><tr><th>Requested</th><th>Amount</th><th>Status</th><th>Paid</th><th>Note</th></tr></thead><tbody>{(history || []).map(h => <tr key={h.id}><td>{new Date(h.requested_at).toLocaleDateString()}</td><td>{money(h.requested_amount)}</td><td>{h.status}</td><td>{h.paid_at ? new Date(h.paid_at).toLocaleDateString() : '—'}</td><td>{h.admin_note || '—'}</td></tr>)}</tbody></table>{!history?.length && <p>No payout requests yet.</p>}</div></section>
  </main>
}
