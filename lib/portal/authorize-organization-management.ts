import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPortalPinSession } from '@/lib/pin-auth'

const MANAGEMENT_ROLES = new Set(['owner', 'admin', 'manager'])

export async function authorizeOrganizationManagement(organizationId: string) {
  const auth = await createClient()
  const [{ data: { user } }, pinSession] = await Promise.all([
    auth.auth.getUser(),
    getPortalPinSession(),
  ])
  const db = createAdminClient()

  const [{ data: platform }, { data: membership }] = await Promise.all([
    user
      ? db.from('platform_admins').select('user_id').eq('user_id', user.id).eq('is_active', true).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? db.from('organization_members').select('role').eq('organization_id', organizationId).eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const pinRole = pinSession?.organizationId === organizationId ? pinSession.role : null
  const role = membership?.role || pinRole
  const ok = !!platform || (!!role && MANAGEMENT_ROLES.has(role))

  return {
    ok,
    status: user || pinSession ? 403 : 401,
    platform: !!platform,
    role,
  }
}
