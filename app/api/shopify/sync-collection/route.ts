import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import {
  shopifyGraphQL,
  stripShopifyGid,
} from '@/lib/shopify/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing')
  }

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing')
  }

  return createSupabaseAdminClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function requirePlatformAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: admin } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  return admin ? user : null
}

type ShopifyVariant = {
  id: string
  title: string
  sku: string | null
  price: string
  inventoryQuantity: number | null
}

type ShopifyProduct = {
  id: string
  title: string
  handle: string
  vendor: string
  productType: string
  status: string
  featuredImage: {
    url: string
  } | null
  variants: {
    nodes: ShopifyVariant[]
  }
}

type CollectionResponse = {
  collection: {
    id: string
    title: string
    handle: string
    products: {
      pageInfo: {
        hasNextPage: boolean
        endCursor: string | null
      }
      nodes: ShopifyProduct[]
    }
  } | null
}

type MoreProductsResponse = {
  collection: {
    products: {
      pageInfo: {
        hasNextPage: boolean
        endCursor: string | null
      }
      nodes: ShopifyProduct[]
    }
  } | null
}

async function chunkInsert(
  supabase: ReturnType<typeof adminClient>,
  table: string,
  rows: any[],
  chunkSize = 400
) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)

    const { error } = await supabase
      .from(table)
      .insert(chunk)

    if (error) throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePlatformAdmin()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const campaignId = body.campaignId as string
    const collectionId = body.collectionId as string

    if (!campaignId || !collectionId) {
      return NextResponse.json(
        {
          error:
            'campaignId and collectionId are required',
        },
        { status: 400 }
      )
    }

    const supabase = adminClient()

    const { data: campaign, error: campaignError } =
      await supabase
        .from('campaigns')
        .select('id, name, organization_id')
        .eq('id', campaignId)
        .maybeSingle()

    if (campaignError) throw campaignError

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    const { data: store, error: storeError } =
      await supabase
        .from('shopify_stores')
        .select('id, organization_id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

    if (storeError) throw storeError

    if (!store) {
      throw new Error(
        'No active Shopify store is configured'
      )
    }

    const initial =
      await shopifyGraphQL<CollectionResponse>(
        `
          query GetCollection(
            $id: ID!
            $after: String
          ) {
            collection(id: $id) {
              id
              title
              handle
              products(
                first: 50
                after: $after
                sortKey: TITLE
              ) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  id
                  title
                  handle
                  vendor
                  productType
                  status
                  featuredImage {
                    url
                  }
                  variants(first: 250) {
                    nodes {
                      id
                      title
                      sku
                      price
                      inventoryQuantity
                    }
                  }
                }
              }
            }
          }
        `,
        {
          id: collectionId,
          after: null,
        }
      )

    if (!initial.collection) {
      return NextResponse.json(
        { error: 'Shopify collection not found' },
        { status: 404 }
      )
    }

    const collection = initial.collection
    const products: ShopifyProduct[] = [
      ...collection.products.nodes,
    ]

    let hasNextPage =
      collection.products.pageInfo.hasNextPage

    let cursor =
      collection.products.pageInfo.endCursor

    while (hasNextPage) {
      const more =
        await shopifyGraphQL<MoreProductsResponse>(
          `
            query MoreCollectionProducts(
              $id: ID!
              $after: String!
            ) {
              collection(id: $id) {
                products(
                  first: 50
                  after: $after
                  sortKey: TITLE
                ) {
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                  nodes {
                    id
                    title
                    handle
                    vendor
                    productType
                    status
                    featuredImage {
                      url
                    }
                    variants(first: 250) {
                      nodes {
                        id
                        title
                        sku
                        price
                        inventoryQuantity
                      }
                    }
                  }
                }
              }
            }
          `,
          {
            id: collectionId,
            after: cursor,
          }
        )

      if (!more.collection) break

      products.push(
        ...more.collection.products.nodes
      )

      hasNextPage =
        more.collection.products.pageInfo.hasNextPage

      cursor =
        more.collection.products.pageInfo.endCursor
    }

    const now = new Date().toISOString()

    const productRows = products.map(product => ({
      shopify_store_id: store.id,
      shopify_product_id: stripShopifyGid(
        product.id
      ),
      title: product.title,
      handle: product.handle,
      vendor: product.vendor || null,
      product_type:
        product.productType || null,
      status:
        product.status?.toLowerCase() || null,
      image_url:
        product.featuredImage?.url || null,
      synced_at: now,
      updated_at: now,
    }))

    const {
      data: savedProducts,
      error: productError,
    } = await supabase
      .from('shopify_products')
      .upsert(productRows, {
        onConflict:
          'shopify_store_id,shopify_product_id',
      })
      .select('id, shopify_product_id')

    if (productError) throw productError

    const productRefMap = new Map(
      (savedProducts || []).map(row => [
        row.shopify_product_id,
        row.id,
      ])
    )

    const variantRows: any[] = []

    for (const product of products) {
      const productId = stripShopifyGid(product.id)
      const productRefId =
        productRefMap.get(productId)

      if (!productRefId) continue

      for (const variant of product.variants.nodes) {
        variantRows.push({
          shopify_product_ref_id: productRefId,
          shopify_variant_id: stripShopifyGid(
            variant.id
          ),
          title: variant.title,
          sku: variant.sku || null,
          price: Number(variant.price || 0),
          inventory_quantity:
            variant.inventoryQuantity ?? null,
          synced_at: now,
          updated_at: now,
        })
      }
    }

    const savedVariants: any[] = []

    for (
      let i = 0;
      i < variantRows.length;
      i += 400
    ) {
      const chunk = variantRows.slice(i, i + 400)

      const {
        data,
        error,
      } = await supabase
        .from('shopify_variants')
        .upsert(chunk, {
          onConflict:
            'shopify_product_ref_id,shopify_variant_id',
        })
        .select(
          'id, shopify_product_ref_id, shopify_variant_id'
        )

      if (error) throw error

      savedVariants.push(...(data || []))
    }

    const variantRefMap = new Map(
      savedVariants.map(row => [
        row.shopify_variant_id,
        row.id,
      ])
    )

    const productByExternalId = new Map(
      products.map(product => [
        stripShopifyGid(product.id),
        product,
      ])
    )

    const allVariantIds = variantRows.map(
      variant => variant.shopify_variant_id
    )

    const existingVariantIds = new Set<string>()

    for (
      let i = 0;
      i < allVariantIds.length;
      i += 300
    ) {
      const ids = allVariantIds.slice(i, i + 300)

      const {
        data: existing,
        error,
      } = await supabase
        .from('campaign_products')
        .select('shopify_variant_id')
        .eq('campaign_id', campaignId)
        .in('shopify_variant_id', ids)

      if (error) throw error

      for (const row of existing || []) {
        if (row.shopify_variant_id) {
          existingVariantIds.add(
            row.shopify_variant_id
          )
        }
      }
    }

    const campaignProductRows: any[] = []

    for (const product of products) {
      const productExternalId =
        stripShopifyGid(product.id)

      const productRefId =
        productRefMap.get(productExternalId)

      for (const variant of product.variants.nodes) {
        const variantExternalId =
          stripShopifyGid(variant.id)

        if (!variantExternalId) {
          continue
        }

        if (
          existingVariantIds.has(
            variantExternalId
          )
        ) {
          continue
        }

        campaignProductRows.push({
          campaign_id: campaignId,
          shopify_product_id:
            productExternalId,
          shopify_variant_id:
            variantExternalId,
          title: product.title,
          variant_title:
            variant.title || null,
          sku: variant.sku || null,
          image_url:
            product.featuredImage?.url || null,
          retail_price: Number(
            variant.price || 0
          ),
          contribution_type: 'fixed',
          contribution_value: 0,
          is_active: true,
          shopify_product_ref_id:
            productRefId || null,
          shopify_variant_ref_id:
            variantRefMap.get(
              variantExternalId
            ) || null,
        })
      }
    }

    if (campaignProductRows.length) {
      await chunkInsert(
        supabase,
        'campaign_products',
        campaignProductRows
      )
    }

    const {
      error: mappingError,
    } = await supabase
      .from('campaign_shopify_collections')
      .upsert(
        {
          campaign_id: campaignId,
          shopify_store_id: store.id,
          shopify_collection_id:
            stripShopifyGid(collection.id),
          title: collection.title,
          handle: collection.handle,
          last_synced_at: now,
          updated_at: now,
        },
        {
          onConflict:
            'campaign_id,shopify_collection_id',
        }
      )

    if (mappingError) throw mappingError

    return NextResponse.json({
      success: true,
      campaign: campaign.name,
      collection: collection.title,
      products: products.length,
      variants: variantRows.length,
      addedToCampaign:
        campaignProductRows.length,
      alreadyLinked:
        variantRows.length -
        campaignProductRows.length,
    })
  } catch (error: any) {
    console.error(
      'Shopify collection sync error:',
      error
    )

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Unable to sync Shopify collection',
      },
      { status: 500 }
    )
  }
}