import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ShopifyCollectionManager from '@/components/ShopifyCollectionManager'
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = 'force-dynamic'

export default async function ShopifyPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: admin } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!admin) {
    redirect('/dashboard')
  }

  const [
    campaignsResult,
    mappingsResult,
    storesResult,
  ] = await Promise.all([
    supabase
      .from('campaigns')
      .select(`
        id,
        name,
        status,
        organizations (
          name
        )
      `)
      .order('created_at', {
        ascending: false,
      }),

    supabase
      .from('campaign_shopify_collections')
      .select(`
        id,
        title,
        handle,
        last_synced_at,
        campaigns (
          id,
          name
        )
      `)
      .order('last_synced_at', {
        ascending: false,
      }),

    supabase
      .from('shopify_stores')
      .select(`
        id,
        shop_domain,
        admin_domain,
        is_active
      `)
      .eq('is_active', true),
  ])

  const campaigns = (
    campaignsResult.data || []
  ).map((campaign: any) => ({
    id: campaign.id,
    name: campaign.name,
    organizationName:
      campaign.organizations?.name ||
      'Organization',
  }))

  const mappings =
    mappingsResult.data || []

  const stores =
    storesResult.data || []

  return (
    <div className="fc-page">

      

      <main className="fc-page">

        <div className="shopify-page">

          <div className="shopify-page-header">
            <div>
              <div className="shopify-eyebrow">
                COMMERCE
              </div>

              <h1>Shopify</h1>

              <p>
                Connect fundraising campaigns
                to specific Shopify collections.
                Only products needed for each
                campaign are imported.
              </p>
            </div>
          </div>

          <section className="shopify-stats">

            <div className="shopify-stat">
              <span className="shopify-stat-label">
                Shopify connection
              </span>

              <strong className="shopify-stat-value">
                {stores.length
                  ? 'Connected'
                  : 'Not connected'}
              </strong>
            </div>

            <div className="shopify-stat">
              <span className="shopify-stat-label">
                Campaigns
              </span>

              <strong className="shopify-stat-value">
                {campaigns.length}
              </strong>
            </div>

            <div className="shopify-stat">
              <span className="shopify-stat-label">
                Collection links
              </span>

              <strong className="shopify-stat-value">
                {mappings.length}
              </strong>
            </div>

          </section>

          {campaigns.length ? (
            <ShopifyCollectionManager
              campaigns={campaigns}
            />
          ) : (
            <section className="shopify-panel">
              <h2>
                Create a campaign first
              </h2>

              <p>
                A Shopify collection needs
                a campaign to attach to.
              </p>
            </section>
          )}

          <section className="shopify-panel">

            <div className="shopify-panel-header">

              <div className="shopify-eyebrow">
                CONNECTED COLLECTIONS
              </div>

              <h2>
                Campaign collection links
              </h2>

            </div>

            {!mappings.length ? (
              <div className="shopify-empty">
                No Shopify collections have
                been attached to campaigns yet.
              </div>
            ) : (
              <div className="shopify-table-wrap">

                <table className="shopify-table">

                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Collection</th>
                      <th>Handle</th>
                      <th>Last synced</th>
                    </tr>
                  </thead>

                  <tbody>

                    {mappings.map(
                      (mapping: any) => (
                        <tr key={mapping.id}>

                          <td>
                            {
                              mapping
                                .campaigns
                                ?.name
                            }
                          </td>

                          <td>
                            {mapping.title}
                          </td>

                          <td>
                            {mapping.handle}
                          </td>

                          <td>
                            {mapping.last_synced_at
                              ? new Date(
                                  mapping.last_synced_at
                                ).toLocaleString()
                              : 'Never'}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>
            )}

          </section>

        </div>

      </main>

    </div>
  )
}