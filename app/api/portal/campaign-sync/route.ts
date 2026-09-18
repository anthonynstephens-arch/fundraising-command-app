import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { authorizeCampaignManagement } from '@/lib/portal/authorize-campaign'
import { syncCollection } from '@/lib/shopify/sync-collection'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

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

    const { data: links, error } = await access.db
      .from('campaign_shopify_collections')
      .select('shopify_collection_id')
      .eq('campaign_id', campaignId)
      .limit(1)

    if (error) throw error
    if (!links?.length) {
      return NextResponse.json({ error: 'No Shopify collection is linked to this campaign.' }, { status: 400 })
    }

    const result = await syncCollection(campaignId, links[0].shopify_collection_id, organizationId)
    revalidatePath('/portal', 'layout')
    revalidatePath('/station', 'layout')
    revalidatePath('/dashboard', 'layout')
    revalidatePath('/fundraisers', 'layout')

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to refresh Shopify products.' },
      { status: 400 }
    )
  }
}
