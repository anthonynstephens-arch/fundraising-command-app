'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { DMD_LOGO, DMD_SLUG } from '@/lib/branding/dmd'

export default function PinChangeForm({ branded = false }: { branded?: boolean }) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!/^\d{4,8}$/.test(pin)) {
      setMessage('Choose a 4–8 digit PIN.')
      return
    }
    if (pin !== confirmPin) {
      setMessage('Those PINs do not match.')
      return
    }

    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/pin-session/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage(data.error || 'Unable to save that PIN.')
        setBusy(false)
        return
      }
      window.location.assign(branded ? '/stores/dmd/portal' : '/portal')
    } catch {
      setMessage('Unable to connect. Please try again.')
      setBusy(false)
    }
  }

  return <main className={branded ? 'center fc-login-page dmd-theme dmd-login' : 'center fc-login-page'}>
    {branded && <aside className="dmd-login-brand">
      <Link href={'/fundraisers/' + DMD_SLUG}><img src={DMD_LOGO} alt="Detroit Metropolitan Dance" /></Link>
      <h1>Your community.<br/><em>In motion.</em></h1>
      <Link href={'/fundraisers/' + DMD_SLUG}>← Back to the apparel store</Link>
    </aside>}
    <section className="card login fc-login-card">
      <div className="eyebrow">{branded ? 'DMD MEMBER ACCESS' : 'FUNDRAISING COMMAND'}</div>
      <h2>Create your private PIN</h2>
      <p>The PIN you received was temporary. Replace it now before opening your portal.</p>
      <form className="fc-email-login fc-change-pin-form" onSubmit={submit}>
        <label>New PIN
          <input inputMode="numeric" autoComplete="new-password" type="password" minLength={4} maxLength={8} pattern="[0-9]{4,8}" required value={pin} onChange={event => { setPin(event.target.value.replace(/\D/g, '').slice(0, 8)); setMessage('') }} />
        </label>
        <label>Confirm new PIN
          <input inputMode="numeric" autoComplete="new-password" type="password" minLength={4} maxLength={8} pattern="[0-9]{4,8}" required value={confirmPin} onChange={event => { setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 8)); setMessage('') }} />
        </label>
        {message && <div className="error">{message}</div>}
        <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save PIN & Continue'}</button>
      </form>
      <small className="fc-pin-security">Use a PIN only you know. You’ll use it for future sign-ins.</small>
    </section>
  </main>
}
