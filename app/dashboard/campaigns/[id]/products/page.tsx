import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CampaignProductContributionManager from '@/components/CampaignProductContributionManager'

export const dynamic = 'force-dynamic'

export default async function CampaignProductsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select(`
      id,
      name,
      status,
      organizations (
        name
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (!campaign) {
    redirect('/dashboard/campaigns')
  }

  const { data: products } = await supabase
    .from('campaign_products')
    .select(`
      id,
      shopify_product_id,
      shopify_variant_id,
      title,
      variant_title,
      sku,
      image_url,
      retail_price,
      contribution_type,
      contribution_value,
      is_active
    `)
    .eq('campaign_id', id)
    .order('title')
    .order('variant_title')

  return (
    <div className="fc-page">

      

      <main className="fc-page">

        <div className="shopify-page">

          <div className="shopify-page-header">

            <div>
              <div className="shopify-eyebrow">
                CAMPAIGN PRODUCTS
              </div>

              <h1>{campaign.name}</h1>

              <p>
                {(campaign as any).organizations?.name}
                {' · '}
                Configure fundraiser contribution rules
                for products attached to this campaign.
              </p>
            </div>

            <Link
              className="secondary-button"
              href={`/dashboard/campaigns/${id}`}
            >
              Back to Campaign
            </Link>

          </div>

          {!products?.length ? (
            <section className="shopify-panel">

              <h2>No products attached yet</h2>

              <p>
                Attach a Shopify collection
                to this campaign first.
              </p>

              <Link
                href="/dashboard/shopify"
                className="primary-button"
              >
                Go to Shopify
              </Link>

            </section>
          ) : (
            <CampaignProductContributionManager
              products={products as any}
            />
          )}

        </div>

      </main>

    </div>
  )
}