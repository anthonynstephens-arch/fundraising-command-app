'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
export default function StationCashOut({ campaignId, available, canRequest, open }: { campaignId: string; available: number; canRequest: boolean; open: boolean }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  async function submit() {
    setBusy(true); setMessage('')
    try {
      const res = await fetch('/api/stations/payout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId }) })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Unable to request payout')
      setMessage('Request submitted for approval.'); router.refresh()
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to submit. Try again.') }
    finally { setBusy(false) }
  }
  return <div className="station-cashout"><button disabled={busy || open || !canRequest || available < 100} onClick={submit}>{busy ? 'Submitting…' : open ? 'Request pending' : 'Cash out'}</button><p>{!canRequest ? 'A station owner or administrator can request funds.' : open ? 'Your existing request must be resolved first.' : available < 100 ? `$${Math.max(0, 100 - available).toFixed(2)} more until you can cash out.` : 'Request your available earnings for approval. No automatic transfer.'}</p><p role="status">{message}</p></div>
}
