import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPortalPinSession } from '@/lib/pin-auth'

const CAMPAIGN_MANAGER_ROLES = new Set(['owner', 'admin', 'manager'])

export async function authorizeCampaignManagement(
  campaignId: string,
  organizationId: string
) {
  const auth = await createClient()
  const [{ data: { user } }, pinSession] = await Promise.all([
    auth.auth.getUser(),
    getPortalPinSession(),
  ])

  if (!user && !pinSession) {
    return { ok: false as const, status: 401, error: 'Sign in to manage this campaign.' }
  }

  const db = createAdminClient()
  const { data: campaign, error: campaignError } = await db
    .from('campaigns')
    .select('id,organization_id,name')
    .eq('id', campaignId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (campaignError) throw campaignError
  if (!campaign) {
    return { ok: false as const, status: 404, error: 'Campaign not found.' }
  }

  if (
    pinSession?.organizationId === organizationId &&
    CAMPAIGN_MANAGER_ROLES.has(pinSession.role)
  ) {
    return { ok: true as const, db, campaign, actorId: `pin:${pinSession.credentialId}` }
  }

  if (!user) {
    return { ok: false as const, status: 403, error: 'You do not have permission to manage this campaign.' }
  }

  const [{ data: platform }, { data: membership }] = await Promise.all([
    db.from('platform_admins').select('user_id').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
    db.from('organization_members').select('role').eq('organization_id', organizationId).eq('user_id', user.id).maybeSingle(),
  ])

  if (platform || CAMPAIGN_MANAGER_ROLES.has(membership?.role || '')) {
    return { ok: true as const, db, campaign, actorId: user.id }
  }

  return { ok: false as const, status: 403, error: 'You do not have permission to manage this campaign.' }
}
