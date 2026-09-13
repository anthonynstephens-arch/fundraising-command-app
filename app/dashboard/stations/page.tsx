import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requirePlatformAdmin } from '@/lib/admin/require-platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { STATION_TYPE, stationCollections } from '@/lib/stations/data'
export const dynamic = 'force-dynamic'
const money = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)

async function saveStation(form: FormData) {
  'use server'
  const gate = await requirePlatformAdmin()
  if (!gate.ok) throw new Error('Platform administrator access required.')
  const id = String(form.get('id') || '')
  const name = String(form.get('name') || '').trim().slice(0,120)
  const house = String(form.get('house') || '').trim().slice(0,80)
  const color = String(form.get('color') || '#cf4538')
  const logo = String(form.get('logo') || '').trim()
  if (!name || !/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Station name and valid color required.')
  if (logo && new URL(logo).protocol !== 'https:') throw new Error('Use an HTTPS logo URL.')
  const db = createAdminClient()
  const values = { name, brand_name_short: house, logo_url: logo || null, brand_primary_color: color, organization_type: STATION_TYPE }
  const result = id
    ? await db.from('organizations').update(values).eq('id', id).eq('organization_type', STATION_TYPE).select('id').single()
    : await db.from('organizations').insert({ ...values, slug: 'dfd-' + crypto.randomUUID(), is_active: true }).select('id').single()
  if (result.error) throw result.error
  revalidatePath('/dashboard/stations'); revalidatePath('/station')
  if (id) revalidatePath('/station/' + id)
  redirect('/dashboard/stations')
}
export default async function StationAdmin() {
  const gate = await requirePlatformAdmin()
  if (!gate.ok) redirect('/login')
  const db = createAdminClient()
  const { data: stations, error } = await db.from('organizations').select('*').eq('organization_type', STATION_TYPE).order('name')
  if (error) throw error
  const rows: Array<{id:string;name:string;brand_name_short:string;logo_url:string;brand_primary_color:string;collections:Awaited<ReturnType<typeof stationCollections>>}> = await Promise.all((stations || []).map(async s => ({ ...s, collections: await stationCollections(db, s.id) })))
  const total = (key: string) => rows.flatMap(r => r.collections).reduce((a,c) => a + Number(c[key] || 0),0)
  return <><section className="fc-page-header"><div><div className="fc-kicker">DETROIT FIRE DEPARTMENT</div><h1>Station command</h1><p>Individual houses. Shared oversight. $100 minimum cash-out per collection.</p></div><Link className="fc-btn" href="/dashboard/payouts">Review payout requests →</Link></section>
    <section className="fc-stat-grid">{[['Stations', rows.length],['Sales',money(total('gross_sales'))],['Available',money(total('available'))],['Pending',money(total('pending'))]].map(([label,value]) => <div className="fc-stat-card" key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}</section>
    <section className="fc-card"><h2>Add a station</h2><p>Create the house first, then use Manage access to add lieutenant and station-manager email accounts as Admin or Owner. Viewers cannot cash out.</p><form action={saveStation} style={{display:'flex',gap:16,flexWrap:'wrap',alignItems:'end'}}><label>Station / company name<input name="name" required maxLength={120} placeholder="Engine 17" /></label><label>House name<input name="house" maxLength={80}/></label><label>Logo URL<input name="logo" type="url" placeholder="https://…" /></label><label>Station color<input type="color" name="color" defaultValue="#cf4538" /></label><button className="fc-btn fc-btn-primary">Create station</button></form></section>
    <section className="fc-list-grid">{rows.map(s => <article className="fc-card" key={s.id}><h2>{s.name}</h2><p>{s.collections.length} collections · {money(s.collections.reduce((a,c)=>a+Number(c.available),0))} available</p><div className="fc-head-actions"><Link className="fc-btn" href={'/station/'+s.id}>Open station</Link><Link className="fc-btn" href={'/dashboard/organizations/'+s.id+'/members'}>Manage access</Link><Link className="fc-btn" href="/dashboard/campaigns">Manage collections</Link></div><details><summary>Edit station branding</summary><form action={saveStation} style={{display:'grid',gap:12,paddingTop:16}}><input name="id" type="hidden" value={s.id}/><label>Station name<input name="name" defaultValue={s.name} required/></label><label>House name<input name="house" defaultValue={s.brand_name_short || ''}/></label><label>Logo URL<input type="url" name="logo" defaultValue={s.logo_url || ''}/></label><label>Color<input type="color" name="color" defaultValue={s.brand_primary_color || '#cf4538'}/></label><button className="fc-btn">Save branding</button></form></details></article>)}</section>{!rows.length && <p>No Detroit Fire stations yet. Add your first station above.</p>}</>
}
