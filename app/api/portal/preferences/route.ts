import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPortalPinSession } from '@/lib/pin-auth'

export const dynamic = 'force-dynamic'

const defaults = {
  email_enabled: true,
  browser_enabled: false,
  in_app_enabled: true,
  new_sales: true,
  payout_updates: true,
  campaign_milestones: true,
  sync_issues: true,
  onboarding_completed_at: null as string | null,
}

async function identityFor(organizationId: string) {
  const auth = await createClient()
  const [{ data: { user } }, pinSession] = await Promise.all([
    auth.auth.getUser(),
    getPortalPinSession(),
  ])
  const db = createAdminClient()
  const matchingPin = pinSession?.organizationId === organizationId ? pinSession : null

  if (matchingPin) return { db, identityType: 'pin', identityId: matchingPin.credentialId }
  if (!user) return null

  const [{ data: platform }, { data: membership }] = await Promise.all([
    db.from('platform_admins').select('user_id').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
    db.from('organization_members').select('id').eq('organization_id', organizationId).eq('user_id', user.id).maybeSingle(),
  ])
  if (!platform && !membership) return null
  return { db, identityType: 'user', identityId: user.id }
}

export async function GET(request: Request) {
  const organizationId = new URL(request.url).searchParams.get('organizationId') || ''
  const identity = organizationId ? await identityFor(organizationId) : null
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await identity.db.from('portal_notification_preferences')
    .select('email_enabled,browser_enabled,in_app_enabled,new_sales,payout_updates,campaign_milestones,sync_issues,onboarding_completed_at')
    .eq('organization_id', organizationId)
    .eq('identity_type', identity.identityType)
    .eq('identity_id', identity.identityId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ preferences: data || defaults })
}

export async function POST(request: Request) {
  const body = await request.json()
  const organizationId = String(body.organizationId || '')
  const identity = organizationId ? await identityFor(organizationId) : null
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload: any = {
    organization_id: organizationId,
    identity_type: identity.identityType,
    identity_id: identity.identityId,
    updated_at: new Date().toISOString(),
  }
  for (const key of ['email_enabled', 'browser_enabled', 'in_app_enabled', 'new_sales', 'payout_updates', 'campaign_milestones', 'sync_issues']) {
    if (typeof body[key] === 'boolean') payload[key] = body[key]
  }
  if (body.onboardingCompleted === true) payload.onboarding_completed_at = new Date().toISOString()

  const { error } = await identity.db.from('portal_notification_preferences')
    .upsert(payload, { onConflict: 'organization_id,identity_type,identity_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
