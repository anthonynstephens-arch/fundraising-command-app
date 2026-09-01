import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { shopifyGraphQL } from '@/lib/shopify/admin'

const TOPICS = [
  'ORDERS_CREATE',
  'ORDERS_UPDATED',
  'ORDERS_CANCELLED',
  'REFUNDS_CREATE',
]

async function requirePlatformAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: admin } = await supabase
    .from('platform_admins')
    .select('is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  return admin ? user : null
}

export async function POST() {
  try {
    const user =
      await requirePlatformAdmin()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const appUrl =
      process.env.APP_URL

    if (!appUrl) {
      throw new Error(
        'APP_URL is missing'
      )
    }

    const webhookUrl =
      `${appUrl.replace(/\/$/, '')}/api/shopify/webhooks`

    const existing: any =
      await shopifyGraphQL(`
        query ExistingWebhooks {
          webhookSubscriptions(first: 100) {
            nodes {
              id
              topic
              uri
            }
          }
        }
      `)

    const subscriptions =
      existing.webhookSubscriptions
        ?.nodes || []

    const results = []

    for (const topic of TOPICS) {
      const alreadyExists =
        subscriptions.some(
          (subscription: any) =>
            subscription.topic ===
              topic &&
            subscription.uri ===
              webhookUrl
        )

      if (alreadyExists) {
        results.push({
          topic,
          status: 'already_registered',
        })
        continue
      }

      const result: any =
        await shopifyGraphQL(
          `
          mutation CreateWebhook(
            $topic: WebhookSubscriptionTopic!
            $webhookSubscription: WebhookSubscriptionInput!
          ) {
            webhookSubscriptionCreate(
              topic: $topic
              webhookSubscription: $webhookSubscription
            ) {
              webhookSubscription {
                id
                topic
                uri
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
          {
            topic,
            webhookSubscription: {
              uri: webhookUrl,
              format: 'JSON',
            },
          }
        )

      const payload =
        result.webhookSubscriptionCreate

      if (
        payload.userErrors?.length
      ) {
        throw new Error(
          `${topic}: ${payload.userErrors
            .map(
              (error: any) =>
                error.message
            )
            .join(', ')}`
        )
      }

      results.push({
        topic,
        status: 'registered',
      })
    }

    return NextResponse.json({
      ok: true,
      webhookUrl,
      results,
    })
  } catch (error: any) {
    console.error(
      'Webhook registration failed',
      error
    )

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Webhook registration failed',
      },
      { status: 500 }
    )
  }
}