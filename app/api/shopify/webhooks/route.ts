import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  importShopifyOrder,
  applyShopifyRefund,
} from '@/lib/shopify/import-order'

function verifyWebhook(
  rawBody: string,
  receivedHmac: string | null
) {
  const secret =
    process.env.SHOPIFY_CLIENT_SECRET

  if (!secret || !receivedHmac) {
    return false
  }

  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64')

  const expected =
    Buffer.from(digest)

  const received =
    Buffer.from(receivedHmac)

  if (
    expected.length !==
    received.length
  ) {
    return false
  }

  return crypto.timingSafeEqual(
    expected,
    received
  )
}

export async function POST(
  request: Request
) {
  const rawBody =
    await request.text()

  const hmac =
    request.headers.get(
      'x-shopify-hmac-sha256'
    )

  if (
    !verifyWebhook(rawBody, hmac)
  ) {
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 401 }
    )
  }

  const topic =
    request.headers.get(
      'x-shopify-topic'
    ) || 'unknown'

  const eventId =
    request.headers.get(
      'x-shopify-event-id'
    ) ||
    crypto
      .createHash('sha256')
      .update(
        `${topic}:${rawBody}`
      )
      .digest('hex')

  const shopDomain =
    request.headers.get(
      'x-shopify-shop-domain'
    )

  if (!shopDomain) {
    return NextResponse.json(
      {
        error:
          'Missing Shopify shop domain',
      },
      { status: 400 }
    )
  }

  let payload: any

  try {
    payload =
      JSON.parse(rawBody)
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    )
  }

  const supabase =
    createAdminClient()

  const { error: eventError } =
    await supabase
      .from('webhook_events')
      .insert({
        provider: 'shopify',
        external_event_id:
          eventId,
        event_type: topic,
        payload,
      })

  if (
    eventError &&
    eventError.code === '23505'
  ) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
    })
  }

  if (eventError) {
    console.error(eventError)

    return NextResponse.json(
      {
        error:
          'Unable to log webhook',
      },
      { status: 500 }
    )
  }

  try {
    let result: any = null

    if (
      topic === 'orders/create' ||
      topic === 'orders/updated' ||
      topic === 'orders/cancelled'
    ) {
      result =
        await importShopifyOrder(
          payload,
          shopDomain
        )
    } else if (
      topic === 'refunds/create'
    ) {
      result =
        await applyShopifyRefund(
          payload
        )
    }

    await supabase
      .from('webhook_events')
      .update({
        processed_at:
          new Date().toISOString(),
        error_message: null,
      })
      .eq(
        'external_event_id',
        eventId
      )

    return NextResponse.json({
      ok: true,
      topic,
      result,
    })
  } catch (error: any) {
    console.error(
      'Webhook processing failed',
      error
    )

    await supabase
      .from('webhook_events')
      .update({
        error_message:
          error?.message ||
          'Processing failed',
      })
      .eq(
        'external_event_id',
        eventId
      )

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Webhook processing failed',
      },
      { status: 500 }
    )
  }
}