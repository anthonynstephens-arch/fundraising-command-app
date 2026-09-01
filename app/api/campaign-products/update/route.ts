import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing')

  return createAdminClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  return data ? user : null
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const ids = Array.isArray(body.ids)
      ? body.ids
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

    const admin = getAdminClient()

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