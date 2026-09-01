'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CampaignControls({
  campaignId,
  status,
}: {
  campaignId: string
  status: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [value, setValue] = useState(status)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function save() {
    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('campaigns')
      .update({ status: value })
      .eq('id', campaignId)

    setSaving(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Campaign updated.')
    router.refresh()
  }

  return (
    <div className="control-card">
      <div>
        <span className="subtle">Campaign status</span>
        <strong>Control campaign availability</strong>
      </div>

      <div className="control-actions">
        <select value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <button className="primary" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Status'}
        </button>
      </div>

      {message && <small>{message}</small>}
    </div>
  )
}