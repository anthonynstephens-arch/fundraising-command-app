'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'

type Campaign = {
  id: string
  name: string
  organizationName: string
}

type Collection = {
  id: string
  title: string
  handle: string
}

export default function ShopifyCollectionManager({
  campaigns,
}: {
  campaigns: Campaign[]
}) {
  const router = useRouter()

  const [collections, setCollections] =
    useState<Collection[]>([])

  const [campaignId, setCampaignId] =
    useState(campaigns[0]?.id || '')

  const [collectionId, setCollectionId] =
    useState('')

  const [loadingCollections, setLoadingCollections] =
    useState(true)

  const [syncing, setSyncing] =
    useState(false)

  const [registering, setRegistering] =
    useState(false)

  const [message, setMessage] =
    useState('')

  const [search, setSearch] =
    useState('')

  async function loadCollections() {
    setLoadingCollections(true)
    setMessage('')

    try {
      const response = await fetch(
        '/api/shopify/collections',
        {
          cache: 'no-store',
        }
      )

      const raw = await response.text()

      let data: any

      try {
        data = JSON.parse(raw)
      } catch {
        data = {
          error:
            raw ||
            `Request failed with status ${response.status}`,
        }
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to load Shopify collections'
        )
      }

      setCollections(
        data.collections || []
      )

      if (
        !collectionId &&
        data.collections?.length
      ) {
        setCollectionId(
          data.collections[0].id
        )
      }
    } catch (error: any) {
      setMessage(
        `Error: ${
          error?.message ||
          'Unable to load collections'
        }`
      )
    } finally {
      setLoadingCollections(false)
    }
  }

  useEffect(() => {
    loadCollections()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredCollections =
    useMemo(() => {
      const q = search
        .trim()
        .toLowerCase()

      if (!q) return collections

      return collections.filter(
        collection =>
          collection.title
            .toLowerCase()
            .includes(q) ||
          collection.handle
            .toLowerCase()
            .includes(q)
      )
    }, [collections, search])

  async function syncCollection() {
    if (!campaignId || !collectionId) {
      setMessage(
        'Choose a campaign and Shopify collection.'
      )
      return
    }

    setSyncing(true)
    setMessage('')

    try {
      const response = await fetch(
        '/api/shopify/sync-collection',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            campaignId,
            collectionId,
          }),
        }
      )

      const raw = await response.text()

      let data: any

      try {
        data = JSON.parse(raw)
      } catch {
        data = {
          error:
            raw ||
            `Request failed with status ${response.status}`,
        }
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Collection sync failed'
        )
      }

      setMessage(
        `✓ ${data.collection} → ${data.campaign}: ${data.products} products, ${data.variants} variants synced. ${data.addedToCampaign} new campaign variants added.`
      )

      router.refresh()
    } catch (error: any) {
      setMessage(
        `Error: ${
          error?.message ||
          'Collection sync failed'
        }`
      )
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

      const raw = await response.text()

      let data: any

      try {
        data = JSON.parse(raw)
      } catch {
        data = {
          error:
            raw ||
            `Request failed with status ${response.status}`,
        }
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Webhook registration failed'
        )
      }

      setMessage(
        '✓ Shopify order and refund webhooks registered.'
      )
    } catch (error: any) {
      setMessage(
        `Error: ${
          error?.message ||
          'Webhook registration failed'
        }`
      )
    } finally {
      setRegistering(false)
    }
  }

  return (
    <div className="shopify-manager">
      <div className="shopify-panel">
        <div className="shopify-panel-header">
          <div className="shopify-eyebrow">
            CAMPAIGN PRODUCT SOURCE
          </div>

          <h2>
            Attach a Shopify collection
          </h2>

          <p className="muted">
            Only products in the selected
            collection will be brought into
            this fundraiser.
          </p>
        </div>

        <div className="shopify-form-grid">
          <label>
            <span>Campaign</span>

            <select
              value={campaignId}
              onChange={event =>
                setCampaignId(
                  event.target.value
                )
              }
            >
              {campaigns.map(
                campaign => (
                  <option
                    key={campaign.id}
                    value={campaign.id}
                  >
                    {campaign.name} —{' '}
                    {
                      campaign.organizationName
                    }
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <span>
              Search collections
            </span>

            <input
              value={search}
              onChange={event =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="PTFD, Breast Cancer, etc."
            />
          </label>

          <label className="shopify-collection-field">
            <span>
              Shopify collection
            </span>

            <select
              value={collectionId}
              onChange={event =>
                setCollectionId(
                  event.target.value
                )
              }
              disabled={
                loadingCollections
              }
            >
              {loadingCollections && (
                <option>
                  Loading Shopify collections…
                </option>
              )}

              {!loadingCollections &&
                filteredCollections.length ===
                  0 && (
                  <option value="">
                    No matching collections
                  </option>
                )}

              {filteredCollections.map(
                collection => (
                  <option
                    key={collection.id}
                    value={collection.id}
                  >
                    {collection.title}
                  </option>
                )
              )}
            </select>
          </label>
        </div>

        <div className="shopify-actions-row">
          <button
            className="primary-button"
            onClick={syncCollection}
            disabled={
              syncing ||
              loadingCollections ||
              !campaignId ||
              !collectionId
            }
          >
            {syncing
              ? 'Syncing selected collection…'
              : 'Sync Selected Collection'}
          </button>

          <button
            className="secondary-button"
            onClick={
              loadCollections
            }
            disabled={
              loadingCollections
            }
          >
            {loadingCollections
              ? 'Loading…'
              : 'Refresh Collections'}
          </button>

          <button
            className="secondary-button"
            onClick={
              registerWebhooks
            }
            disabled={registering}
          >
            {registering
              ? 'Registering…'
              : 'Register Webhooks'}
          </button>
        </div>

        {message && (
          <div
            className={
              message.startsWith('Error:')
                ? 'shopify-message error'
                : 'shopify-message success'
            }
          >
            {message}
          </div>
        )}
      </div>
    </div>
  )
}