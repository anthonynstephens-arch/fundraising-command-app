'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CampaignGoalEditor({
  campaignId,
  organizationId,
  goalAmount,
  salesGoalAmount,
}: {
  campaignId: string
  organizationId: string
  goalAmount: number
  salesGoalAmount: number
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
      const response = await fetch('/api/portal/campaign-goals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          organizationId,
          goalAmount: form.get('goalAmount'),
          salesGoalAmount: form.get('salesGoalAmount'),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save goals.')
      setMessage('Goals updated.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save goals.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="agency-card agency-goal-editor">
      <header>
        <div>
          <h2>Adjust Campaign Goals</h2>
          <p>Update the targets shown throughout your campaign dashboard.</p>
        </div>
      </header>
      <form onSubmit={save}>
        <label>
          <span>Fundraising goal</span>
          <div className="agency-money-input"><span aria-hidden="true">$</span><input aria-label="Fundraising goal in dollars" name="goalAmount" type="number" min="0" max="100000000" step="0.01" defaultValue={goalAmount} required /></div>
        </label>
        <label>
          <span>Sales goal</span>
          <div className="agency-money-input"><span aria-hidden="true">$</span><input aria-label="Sales goal in dollars" name="salesGoalAmount" type="number" min="0" max="100000000" step="0.01" defaultValue={salesGoalAmount} required /></div>
        </label>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Goals'}</button>
      </form>
      {message && <p className="agency-form-message" role="status">{message}</p>}
    </article>
  )
}
