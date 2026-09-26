import { syncOrderStatuses } from '@/lib/shopify/sync-order-status'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncCollection } from '@/lib/shopify/sync-collection'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type CampaignLink = {
  campaign_id: string
  shopify_collection_id: string
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let orderSync: {synced?: number; error?: string}
  try { orderSync = await syncOrderStatuses() } catch (error) {
    console.error('Shopify order status reconciliation failed', error)
    orderSync = {error: 'Order status reconciliation failed'}
  }
  const db = createAdminClient()
  const { data, error } = await db
    .from('campaign_shopify_collections')
    .select('campaign_id,shopify_collection_id,campaigns!inner(status)')
    .in('campaigns.status', ['active', 'draft'])
    .order('campaign_id')

  if (error) {
    console.error('Hourly Shopify sync could not load linked campaigns', error)
    return NextResponse.json({ error: 'Unable to load linked Shopify campaigns.' }, { status: 500 })
  }

  // syncCollection refreshes every collection linked to the campaign. Use one
  // representative link per campaign so campaigns with multiple collections
  // are refreshed once and keep a single consistent product union.
  const campaigns = new Map<string, CampaignLink>()
  for (const row of (data ?? []) as unknown as CampaignLink[]) {
    if (!campaigns.has(row.campaign_id)) campaigns.set(row.campaign_id, row)
  }

  const results: Array<Record<string, unknown>> = []
  for (const link of campaigns.values()) {
    try {
      const result = await syncCollection(link.campaign_id, link.shopify_collection_id)
      results.push({ ok: true, ...result })
    } catch (syncError) {
      const message = syncError instanceof Error ? syncError.message : 'Unknown sync error'
      console.error(`Hourly Shopify sync failed for campaign ${link.campaign_id}`, syncError)
      results.push({ campaignId: link.campaign_id, ok: false, error: message })
    }
  }

  revalidatePath('/portal', 'layout')
  revalidatePath('/station', 'layout')
  revalidatePath('/dashboard', 'layout')
  revalidatePath('/fundraisers', 'layout')

  const failed = results.filter(result => !result.ok).length
  return NextResponse.json({
    ok: failed === 0 && !orderSync.error,
    orderSync,
    syncedAt: new Date().toISOString(),
    linkedCampaigns: campaigns.size,
    succeeded: results.length - failed,
    failed,
    results,
  })
}
