import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { getPortalPinSession } from '@/lib/pin-auth'
import { resolvePortalContext } from '@/lib/portal/context'

export const STATION_TYPE = 'detroit_fire_station'
export async function stationAccess(id?: string) {
  const auth = await createClient()
  const [{ data: { user } }, savedPinSession] = await Promise.all([
    auth.auth.getUser(), getPortalPinSession()
  ])
  if (!user && !savedPinSession) redirect('/login')
  const db = createAdminClient()
  const { data: admin, error } = user ? await db.from('platform_admins').select('user_id').eq('user_id', user.id).eq('is_active', true).maybeSingle() : { data: null, error: null }
  if (error) throw error
  const { data: memberships, error: memberError } = user ? await db.from('organization_members').select('organization_id,role').eq('user_id', user.id) : { data: [], error: null }
  if (memberError) throw memberError
  let query = db.from('organizations').select('*').eq('organization_type', STATION_TYPE).eq('is_active', true).order('name')
  if (!admin) {
    const allowedIds = (memberships || []).map(m => m.organization_id)
    if (savedPinSession) allowedIds.push(savedPinSession.organizationId)
    query = query.in('id', [...new Set(allowedIds)])
  }
  const { data: stations, error: stationError } = await query
  if (stationError) throw stationError
  const station = id ? stations?.find(s => s.id === id) : null
  if (id && !station) notFound()
  const context = resolvePortalContext(id, !!admin, memberships || [], savedPinSession)
  const pinSession = context.usePin ? savedPinSession : null
  const portalUser = user || { id: `pin:${pinSession!.credentialId}`, email: pinSession!.displayName }
  // Payout submission still requires the email identity checked by its database RPC.
  const canRequest = !!admin || (!pinSession && !!user && ['owner', 'admin'].includes(context.role || ''))
  return { db, user: portalUser, pinSession, stations: stations || [], station, admin: !!admin, canRequest }
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
