import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {emailConfigured} from '@/lib/portal/email-transport'
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
  onboarding_version: 0,
  notifications_read_at: null as string | null,
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
    .select('email_enabled,browser_enabled,in_app_enabled,new_sales,payout_updates,campaign_milestones,sync_issues,onboarding_completed_at,onboarding_version,notifications_read_at')
    .eq('organization_id', organizationId)
    .eq('identity_type', identity.identityType)
    .eq('identity_id', identity.identityId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const recipient = identity.identityType==='pin' ? (await identity.db.from('portal_pin_credentials').select('email').eq('id',identity.identityId).single()).data?.email : (await identity.db.auth.admin.getUserById(identity.identityId)).data.user?.email
  return NextResponse.json({ emailConfigured:emailConfigured(), notificationEmail:recipient||'', canEditEmail:identity.identityType==='pin', preferences: data || defaults,identityKey:identity.identityType+':'+identity.identityId },{headers:{'Cache-Control':'no-store'}})
}

export async function POST(request: Request) {
  const body = await request.json()
  const organizationId = String(body.organizationId || '')
  const identity = organizationId ? await identityFor(organizationId) : null
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if(body.notificationEmail!==undefined&&identity.identityType==='pin'){
    const email=String(body.notificationEmail).trim().toLowerCase()
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return NextResponse.json({error:'Enter a valid email address.'},{status:400})
    const {error}=await identity.db.from('portal_pin_credentials').update({email:email||null}).eq('id',identity.identityId).eq('organization_id',organizationId)
    if(error)return NextResponse.json({error:'Could not save this email. It may already belong to another member.'},{status:400})
  }
  const payload: any = {
    organization_id: organizationId,
    identity_type: identity.identityType,
    identity_id: identity.identityId,
    updated_at: new Date().toISOString(),
  }
  for (const key of ['email_enabled', 'browser_enabled', 'in_app_enabled', 'new_sales', 'payout_updates', 'campaign_milestones', 'sync_issues']) {
    if (typeof body[key] === 'boolean') payload[key] = body[key]
  }
  if (body.onboardingCompleted === true) {payload.onboarding_completed_at = new Date().toISOString();payload.onboarding_version=2}
  if (body.markNotificationsRead === true) payload.notifications_read_at = new Date().toISOString()

  const { error } = await identity.db.from('portal_notification_preferences')
    .upsert(payload, { onConflict: 'organization_id,identity_type,identity_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
