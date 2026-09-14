import Link from 'next/link'
import PortalShell from '@/components/portal/PortalShell'
import { stationAccess } from '@/lib/stations/data'
import './station.css'
export const dynamic = 'force-dynamic'
export default async function Stations() {
  const { stations, admin, user } = await stationAccess()
  return <PortalShell org={{name:"Detroit Fire Department"}} campaign={null} campaigns={[]} userEmail={user.email || ""} organizationId="" platform={admin}><div className="station-app"><header className="agency-hero"><p className="station-eyebrow">DETROIT FIRE DEPARTMENT</p><h1>Station overview</h1><p>Select your station to view collections and request earned funds.</p>{admin && <Link href="/dashboard/stations">Manage stations →</Link>}</header><div className="station-grid">{stations.map(s => <Link className="station-card" href={'/station/' + s.id} key={s.id}>{s.logo_url && <img className="station-directory-logo" src={s.logo_url} alt={s.name + " logo"} />}<span className="station-eyebrow">STATION PORTAL</span><h2>{s.name}</h2><p>{s.brand_name_short || 'Detroit Fire Department'}</p><strong>Open station →</strong></Link>)}</div>{!stations.length && <section className="station-card"><h2>No station access yet</h2><p>Your administrator needs to create your station and add your email account. Station cash-out uses email sign-in, not a department PIN.</p></section>}</div></PortalShell>
}
