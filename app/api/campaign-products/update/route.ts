import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPortalPinSession } from '@/lib/pin-auth'

export const dynamic = 'force-dynamic'

async function canManageProducts(ids: string[]) {
  const supabase = await createClient()
  const [{ data: { user } }, pinSession] = await Promise.all([
    supabase.auth.getUser(),
    getPortalPinSession(),
  ])
  if (!user && !pinSession) return false

  const admin = createAdminClient()
  const { data: productRows } = await admin
    .from('campaign_products')
    .select('id,campaign_id')
    .in('id', ids)
  if (!productRows || productRows.length !== ids.length) return false

  const campaignIds = [...new Set(productRows.map(product => product.campaign_id))]
  const { data: campaigns } = await admin
    .from('campaigns')
    .select('id,organization_id')
    .in('id', campaignIds)
  if (!campaigns || campaigns.length !== campaignIds.length) return false

  const organizationIds = [...new Set(campaigns.map(campaign => campaign.organization_id))]
  if (pinSession && ['owner', 'admin'].includes(pinSession.role)) {
    if (organizationIds.every(id => id === pinSession.organizationId)) return true
  }
  if (!user) return false

  const [{ data: platform }, { data: memberships }] = await Promise.all([
    admin.from('platform_admins').select('user_id').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
    admin.from('organization_members').select('organization_id,role').eq('user_id', user.id).in('organization_id', organizationIds),
  ])
  if (platform) return true

  const manageable = new Set((memberships || [])
    .filter(member => member.role === 'owner' || member.role === 'admin')
    .map(member => member.organization_id))
  return organizationIds.every(id => manageable.has(id))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const ids: string[] = Array.isArray(body.ids)
      ? Array.from(new Set<string>(body.ids.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)))
      : []

    const contributionType =
      body.contributionType

    const contributionValue =
      Number(body.contributionValue)

    const isActive =
      typeof body.isActive === 'boolean'
        ? body.isActive
        : undefined

    if (!ids.length) {
      return NextResponse.json(
        { error: 'No campaign products selected' },
        { status: 400 }
      )
    }

    if (
      contributionType !== 'fixed' &&
      contributionType !== 'percentage'
    ) {
      return NextResponse.json(
        { error: 'Invalid contribution type' },
        { status: 400 }
      )
    }

    if (
      !Number.isFinite(contributionValue) ||
      contributionValue < 0
    ) {
      return NextResponse.json(
        { error: 'Invalid contribution value' },
        { status: 400 }
      )
    }

    if (
      contributionType === 'percentage' &&
      contributionValue > 100
    ) {
      return NextResponse.json(
        {
          error:
            'Percentage contribution cannot exceed 100%',
        },
        { status: 400 }
      )
    }

    if (!await canManageProducts(ids)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const admin = createAdminClient()

    const updatePayload: any = {
      contribution_type:
        contributionType,
      contribution_value:
        contributionValue,
    }

    if (typeof isActive === 'boolean') {
      updatePayload.is_active = isActive
    }

    const { error } = await admin
      .from('campaign_products')
      .update(updatePayload)
      .in('id', ids)

    if (error) throw error

    return NextResponse.json({
      success: true,
      updated: ids.length,
    })
  } catch (error: any) {
    console.error(
      'Campaign contribution update error:',
      error
    )

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Unable to update campaign products',
      },
      { status: 500 }
    )
  }
}
