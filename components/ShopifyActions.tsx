'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ShopifyActions() {
  const router = useRouter()

  const [syncing, setSyncing] =
    useState(false)

  const [
    registering,
    setRegistering,
  ] = useState(false)

  const [message, setMessage] =
    useState('')

  async function syncProducts() {
    setSyncing(true)
    setMessage('')

    try {
      const response = await fetch(
        '/api/shopify/sync',
        {
          method: 'POST',
        }
      )

      const json =
        await response.json()

      if (!response.ok) {
        throw new Error(
          json.error ||
            'Sync failed'
        )
      }

      setMessage(
        `Synced ${json.products} products and ${json.variants} variants.`
      )

      router.refresh()
    } catch (error: any) {
      setMessage(error.message)
    } finally {
      setSyncing(false)
    }
  }

  async function registerWebhooks() {
    setRegistering(true)
    setMessage('')

    try {
      const response = await fetch(
        '/api/shopify/register-webhooks',
        {
          method: 'POST',
        }
      )

      const json =
        await response.json()

      if (!response.ok) {
        throw new Error(
          json.error ||
            'Webhook registration failed'
        )
      }

      setMessage(
        'Shopify webhooks registered.'
      )
    } catch (error: any) {
      setMessage(error.message)
    } finally {
      setRegistering(false)
    }
  }

  return (
    <div className="shopify-actions">
      <button
        className="primary"
        disabled={syncing}
        onClick={syncProducts}
      >
        {syncing
          ? 'Syncing Shopify...'
          : 'Sync Products'}
      </button>

      <button
        className="secondary-button"
        disabled={registering}
        onClick={registerWebhooks}
      >
        {registering
          ? 'Registering...'
          : 'Register Webhooks'}
      </button>

      {message && (
        <p className="sync-message">
          {message}
        </p>
      )}
    </div>
  )
}