import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { shopifyGraphQL } from '@/lib/shopify/admin'

export const dynamic = 'force-dynamic'

type CollectionNode = {
  id: string
  title: string
  handle: string
}

type CollectionsResponse = {
  collections: {
    pageInfo: {
      hasNextPage: boolean
      endCursor: string | null
    }
    nodes: CollectionNode[]
  }
}

async function requirePlatformAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return false
  }

  const { data: admin } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  return !!admin
}

export async function GET() {
  try {
    const allowed = await requirePlatformAdmin()

    if (!allowed) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const collections: CollectionNode[] = []
    let cursor: string | null = null
    let hasNextPage = true

    while (hasNextPage && collections.length < 500) {
      const data: CollectionsResponse =
        await shopifyGraphQL<CollectionsResponse>(
          `
            query GetCollections($after: String) {
              collections(
                first: 100
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
                }
              }
            }
          `,
          { after: cursor }
        )

      collections.push(...data.collections.nodes)

      hasNextPage = data.collections.pageInfo.hasNextPage
      cursor = data.collections.pageInfo.endCursor
    }

    return NextResponse.json({
      collections: collections.sort((a, b) =>
        a.title.localeCompare(b.title)
      ),
    })
  } catch (error: any) {
    console.error('Shopify collections error:', error)

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Unable to load Shopify collections',
      },
      { status: 500 }
    )
  }
}