import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'

export const STATION_TYPE = 'detroit_fire_station'
export async function stationAccess(id?: string) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login')
  const db = createAdminClient()
  const { data: admin, error } = await db.from('platform_admins').select('user_id').eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (error) throw error
  const { data: memberships, error: memberError } = await db.from('organization_members').select('organization_id,role').eq('user_id', user.id)
  if (memberError) throw memberError
  let query = db.from('organizations').select('*').eq('organization_type', STATION_TYPE).eq('is_active', true).order('name')
  if (!admin) query = query.in('id', (memberships || []).map(m => m.organization_id))
  const { data: stations, error: stationError } = await query
  if (stationError) throw stationError
  const station = id ? stations?.find(s => s.id === id) : null
  if (id && !station) notFound()
  const role = memberships?.find(m => m.organization_id === id)?.role
  return { db, user, stations: stations || [], station, admin: !!admin, canRequest: !!admin || ['owner', 'admin'].includes(role || '') }
}

export async function stationCollections(db: ReturnType<typeof createAdminClient>, organizationId: string): Promise<Array<{id:string;name:string;available:number;[key:string]:any}>> {
  const { data: campaigns, error } = await db.from('campaigns').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false })
  if (error) throw error
  return Promise.all((campaigns || []).map(async campaign => {
    const { data, error } = await db.rpc('station_collection_balance', { target_campaign: campaign.id })
    if (error) throw error
    return { ...campaign, ...data[0] }
  }))
}
