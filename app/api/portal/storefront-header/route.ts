import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { authorizeCampaignStorefrontEditing } from '@/lib/portal/authorize-campaign'

const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''

function readDate(value: unknown, endOfDay = false) {
  const raw = text(value, 10)
  if (!raw) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error('Enter valid campaign dates.')
  const date = new Date(`${raw}T${endOfDay ? '23:59:59.999' : '00:00:00'}`)
  if (Number.isNaN(date.getTime())) throw new Error('Enter valid campaign dates.')
  return date
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const campaignId = text(body.campaignId, 100)
    const organizationId = text(body.organizationId, 100)
    if (!campaignId || !organizationId) {
      return NextResponse.json({ error: 'Missing campaign or organization.' }, { status: 400 })
    }

    const access = await authorizeCampaignStorefrontEditing(campaignId, organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const name = text(body.name, 180)
    if (!name) return NextResponse.json({ error: 'Store title is required.' }, { status: 400 })
    const start = readDate(body.startsAt)
    const end = readDate(body.endsAt, true)
    if (start && end && end.getTime() < start.getTime()) {
      return NextResponse.json({ error: 'Campaign end date must be after the start date.' }, { status: 400 })
    }

    const { error } = await access.db.from('campaigns').update({
      name,
      storefront_eyebrow: text(body.storefrontEyebrow, 80) || null,
      storefront_supporting_text: text(body.storefrontSupportingText, 160) || null,
      description: text(body.description, 1000) || null,
      storefront_header_message: text(body.storefrontHeaderMessage, 240) || null,
      starts_at: start?.toISOString() || null,
      ends_at: end?.toISOString() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', campaignId).eq('organization_id', organizationId)
    if (error) throw error

    revalidatePath('/portal', 'layout')
    revalidatePath('/station', 'layout')
    revalidatePath('/fundraisers', 'layout')
    revalidatePath(`/fundraisers/${access.campaign.slug}`)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update storefront header.' }, { status: 400 })
  }
}
