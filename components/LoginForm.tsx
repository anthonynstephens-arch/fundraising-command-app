'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {DMD_LOGO,DMD_SLUG} from '@/lib/branding/dmd'

export default function LoginForm({branded=false,macac=false}:{branded?:boolean;macac?:boolean}) {
  const [mode, setMode] = useState<'pin' | 'email'>('pin')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  function addDigit(digit: number) {
    if (pin.length < 8) {
      setPin(pin + digit)
      setMsg('')
    }
  }

  async function submitPin() {
    if (pin.length < 4) {
      setMsg('Enter your 4–8 digit PIN.')
      return
    }
    setBusy(true)
    setMsg('')
    try {
    const response = await fetch('/api/pin-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    const data = await response.json()
    setBusy(false)
    if (!response.ok) {
      setPin('')
      setMsg(data.error || 'Incorrect PIN.')
      return
    }
    if (data.mustChangePin) {
      window.location.assign(macac ? '/stores/macac/change-pin' : branded ? '/stores/dmd/change-pin' : '/change-pin')
      return
    }
    window.location.assign(macac ? '/stores/macac/portal' : branded ? '/stores/dmd/portal' : data.redirectTo === '/dashboard' ? '/dashboard' : '/portal')
    } catch { setMsg('Unable to connect. Please try again.'); setBusy(false) }
  }

  async function submitEmail(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMsg('')
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      setMsg(error.message)
      return
    }
    router.push(macac ? '/stores/macac/portal' : branded ? '/stores/dmd/portal' : '/home')
    router.refresh()
  }

  return <main className={macac?"center fc-login-page macac-theme macac-login":branded?"center fc-login-page dmd-theme dmd-login":"center fc-login-page"}>
    {macac&&<aside className="macac-login-brand"><Link href="/stores/macac" className="macac-portal-wordmark"><img src="/brand/macac/logo-white.png" alt="MACAC — Michigan Association for College Admission Counseling" className="macac-official-logo" /></Link><h1>Bridging the path<br/><em>to college.</em></h1><p>Your merchandise, community, and campaign activity—all in one place.</p><Link href="/stores/macac">← Back to the collection</Link></aside>}
    {branded&&<aside className="dmd-login-brand"><Link href={"/fundraisers/"+DMD_SLUG}><img src={DMD_LOGO} alt="Detroit Metropolitan Dance"/></Link><h1>Your community.<br/><em>In motion.</em></h1><Link href={"/fundraisers/"+DMD_SLUG}>← Back to the apparel store</Link></aside>}
    <section className="card login fc-login-card">
      <div className="eyebrow">{macac?"MACAC MEMBER ACCESS":branded?"DMD MEMBER ACCESS":"FUNDRAISING COMMAND"}</div>
      <h2>{mode === 'pin' ? 'Enter your access PIN' : 'Welcome back'}</h2>
      <p>{mode === 'pin' ? 'Use the PIN provided by your department or organization.' : macac?'Sign in to your MACAC merchandise portal.':branded?'Sign in to your Detroit Metropolitan Dance workspace.':'Sign in to your Fundraising Command workspace.'}</p>

      <div className="fc-login-tabs" role="tablist" aria-label="Sign-in method">
        <button type="button" className={mode === 'pin' ? 'active' : ''} onClick={() => { setMode('pin'); setMsg('') }}>PIN Login</button>
        <button type="button" className={mode === 'email' ? 'active' : ''} onClick={() => { setMode('email'); setMsg('') }}>Email Login</button>
      </div>

      {mode === 'pin' ? <>
        <div className="fc-pin-display" aria-label={`${pin.length} PIN digits entered`}>
          {Array.from({ length: Math.max(4, pin.length) }).map((_, index) =>
            <span key={index} className={index < pin.length ? 'filled' : ''}/>
          )}
        </div>
        <div className="fc-pin-pad">
          {[1,2,3,4,5,6,7,8,9].map(digit =>
            <button type="button" key={digit} onClick={() => addDigit(digit)}>{digit}</button>
          )}
          <button type="button" className="muted" onClick={() => setPin('')}>Clear</button>
          <button type="button" onClick={() => addDigit(0)}>0</button>
          <button type="button" className="muted" aria-label="Delete digit" onClick={() => setPin(pin.slice(0, -1))}>⌫</button>
        </div>
        {msg && <div className="error">{msg}</div>}
        <button type="button" className="primary fc-pin-submit" disabled={busy || pin.length < 4} onClick={submitPin}>
          {busy ? 'Checking…' : 'Open Portal'}
        </button>
        <small className="fc-pin-security">Five incorrect attempts lock the device for 15 minutes.</small>
      </> : <form className="fc-email-login" onSubmit={submitEmail}>
        <label>Email<input type="email" required value={email} onChange={event => setEmail(event.target.value)}/></label>
        <label>Password<input type="password" required value={password} onChange={event => setPassword(event.target.value)}/></label>
        {msg && <div className="error">{msg}</div>}
        <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>}
    </section>
  </main>
}
