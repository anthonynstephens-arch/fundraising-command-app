'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

function toDateInput(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

export default function StorefrontHeaderEditor({
  campaign,
  organizationName,
}: {
  campaign: any
  organizationName: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    const form = new FormData(event.currentTarget)

    try {
      const response = await fetch('/api/portal/storefront-header', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          organizationId: campaign.organization_id,
          name: form.get('name'),
          storefrontEyebrow: form.get('storefrontEyebrow'),
          storefrontSupportingText: form.get('storefrontSupportingText'),
          description: form.get('description'),
          storefrontHeaderMessage: form.get('storefrontHeaderMessage'),
          startsAt: form.get('startsAt'),
          endsAt: form.get('endsAt'),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save storefront header.')
      setMessage('Storefront header updated.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save storefront header.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="agency-card agency-storefront-editor">
      <header>
        <div>
          <h2>Store Header</h2>
          <p>Edit the public text and campaign information customers see above the products.</p>
        </div>
        <a href={`/fundraisers/${campaign.slug}`} target="_blank" rel="noopener noreferrer">Preview store ↗</a>
      </header>
      <form onSubmit={save}>
        <label><span>Store title</span><input name="name" maxLength={180} defaultValue={campaign.name || ''} required /></label>
        <label><span>Small heading</span><input name="storefrontEyebrow" maxLength={80} defaultValue={campaign.storefront_eyebrow || ''} placeholder="OFFICIAL FUNDRAISER STORE" /></label>
        <label className="agency-editor-wide"><span>Supporting line</span><input name="storefrontSupportingText" maxLength={160} defaultValue={campaign.storefront_supporting_text || ''} placeholder={`Supporting ${organizationName}`} /></label>
        <label className="agency-editor-wide"><span>Description</span><textarea name="description" maxLength={1000} rows={4} defaultValue={campaign.description || ''} placeholder={`Shop official merchandise supporting ${organizationName}.`} /></label>
        <label className="agency-editor-wide"><span>Announcement (optional)</span><input name="storefrontHeaderMessage" maxLength={240} defaultValue={campaign.storefront_header_message || ''} placeholder="Example: Orders close Friday at midnight." /></label>
        <label><span>Start date</span><input name="startsAt" type="date" defaultValue={toDateInput(campaign.starts_at)} /></label>
        <label><span>End date</span><input name="endsAt" type="date" defaultValue={toDateInput(campaign.ends_at)} /></label>
        <div className="agency-editor-actions"><button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Store Header'}</button></div>
      </form>
      {message && <p className="agency-form-message" role="status">{message}</p>}
    </article>
  )
}
