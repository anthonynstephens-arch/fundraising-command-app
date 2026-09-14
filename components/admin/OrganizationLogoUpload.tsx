'use client'
import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import './organization-logo.css'

export default function OrganizationLogoUpload({ organizationId, name, logoUrl }: { organizationId: string; name: string; logoUrl?: string | null }) {
  const inputId = useId()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [url, setUrl] = useState(logoUrl)
  async function save(file?: File) {
    setMessage(''); setFailed(false)
    if (file && (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024)) {
      setFailed(true); setMessage('Choose a PNG, JPG, or WebP image up to 3 MB.'); return
    }
    setBusy(true)
    try {
      const form = new FormData()
      form.set('organizationId', organizationId)
      if (file) form.set('file', file)
      else form.set('remove', 'true')
      const response = await fetch('/api/admin/organization-logo', { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save logo.')
      setUrl(data.logoUrl); setMessage(file ? 'Logo saved.' : 'Logo removed.'); router.refresh()
    } catch (error) {
      setFailed(true); setMessage(error instanceof Error ? error.message : 'Unable to save logo. Please try again.')
    } finally { setBusy(false) }
  }
  return <div className="organization-logo-upload" aria-busy={busy}>
    <div className="organization-logo-preview">{url ? <img src={url} alt={name + ' logo'} /> : <span>No logo</span>}</div>
    <div className="organization-logo-controls">
      <label htmlFor={inputId}>{name} logo</label>
      <p>PNG, JPG, or WebP · Up to 3 MB. Transparent PNG works best.</p>
      <input id={inputId} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => { const file=e.target.files?.[0]; if(file) void save(file); e.target.value='' }} />
      {url && <button type="button" className="fc-btn" disabled={busy} onClick={() => save()}>Remove logo</button>}
      <p role={failed ? 'alert' : 'status'} className={failed ? 'logo-error' : 'logo-status'}>{busy ? 'Saving logo…' : message}</p>
    </div>
  </div>
}
