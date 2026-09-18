import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { authorizeCampaignManagement } from '@/lib/portal/authorize-campaign'

function readGoal(value: unknown, label: string) {
  const goal = Number(value)
  if (!Number.isFinite(goal) || goal < 0 || goal > 100000000) {
    throw new Error(`${label} must be between $0 and $100,000,000.`)
  }
  return Math.round(goal * 100) / 100
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const campaignId = String(body.campaignId || '')
    const organizationId = String(body.organizationId || '')

    if (!campaignId || !organizationId) {
      return NextResponse.json({ error: 'Missing campaign or organization.' }, { status: 400 })
    }

    const access = await authorizeCampaignManagement(campaignId, organizationId)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const goalAmount = readGoal(body.goalAmount, 'Fundraising goal')
    const salesGoalAmount = readGoal(body.salesGoalAmount, 'Sales goal')
    const { error } = await access.db
      .from('campaigns')
      .update({
        goal_amount: goalAmount,
        sales_goal: salesGoalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .eq('organization_id', organizationId)

    if (error) throw error

    revalidatePath('/portal', 'layout')
    revalidatePath('/station', 'layout')
    revalidatePath('/dashboard', 'layout')
    revalidatePath('/fundraisers', 'layout')

    return NextResponse.json({ ok: true, goalAmount, salesGoalAmount })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update campaign goals.' },
      { status: 400 }
    )
  }
}
