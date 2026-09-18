'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CampaignCollectionSyncButton({
  campaignId,
  organizationId,
}: {
  campaignId: string
  organizationId: string
}) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')

  async function sync() {
    setSyncing(true)
    setMessage('')
    try {
      const response = await fetch('/api/portal/campaign-sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId, organizationId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to refresh products.')
      setMessage(`${data.products} products and ${data.variants} variants are current.`)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to refresh products.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="agency-sync-control">
      <button type="button" onClick={sync} disabled={syncing}>{syncing ? 'Refreshing Shopify…' : 'Refresh Shopify Products'}</button>
      {message && <span role="status">{message}</span>}
    </div>
  )
}
