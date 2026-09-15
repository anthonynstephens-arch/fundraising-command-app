'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function StationLogin() {
  const router = useRouter()
  const [mode, setMode] = useState<'pin' | 'email'>('pin')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function signIn(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      if (mode === 'pin') {
        if (!/^\d{4,8}$/.test(pin)) throw new Error('Enter your 4–8 digit station PIN.')
        const response = await fetch('/api/pin-session', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to sign in. Check your PIN and try again.')
        window.location.assign(data.redirectTo === '/dashboard' ? '/dashboard' : '/station/' + encodeURIComponent(data.organizationId))
        return
      } else {
        const { error } = await createClient().auth.signInWithPassword({ email, password })
        if (error) throw error
        router.replace('/station')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="fs-login">
    <header className="fs-login-top"><span>DETROIT DECAL & APPAREL</span><span>STATION PORTAL</span></header>
    <div className="fs-login-layout">
      <section className="fs-login-brand" aria-label="Firestation Command">
        <img className="fs-login-logo" src="/brand/firestation-command.webp" alt="Firestation Command" />
        <div className="fs-login-rule" />
        <p className="fs-login-eyebrow">YOUR HOUSE. YOUR MISSION.</p>
        <h1>Built for<br />your station.</h1>
        <p className="fs-login-intro">Your collections, your sales, and every dollar raised. One place to keep your house moving forward.</p>
        <div className="fs-login-features"><span>Collection progress</span><span>Sales & orders</span><span>Station earnings</span></div>
      </section>
      <section className="fs-login-card">
        <span className="fs-card-eyebrow">MEMBER ACCESS</span>
        <h2>Welcome to the house.</h2>
        <p>Sign in to your station’s command center.</p>
        <div className="fs-login-tabs" aria-label="Sign-in method">
          <button type="button" aria-pressed={mode === 'pin'} disabled={busy} onClick={() => {setMode('pin');setError('')}}>Station PIN</button>
          <button type="button" aria-pressed={mode === 'email'} disabled={busy} onClick={() => {setMode('email');setError('')}}>Email & password</button>
        </div>
        <form onSubmit={signIn}>
          {mode === 'pin' ? <>
            <label htmlFor="station-pin">Access PIN</label>
            <input id="station-pin" className="fs-pin-input" type="password" inputMode="numeric" autoComplete="current-password" pattern="[0-9]{4,8}" minLength={4} maxLength={8} required value={pin} disabled={busy} placeholder="Enter your PIN" onChange={e=>setPin(e.target.value.replace(/\D/g,''))} aria-describedby="station-pin-help" />
            <p className="fs-input-help" id="station-pin-help">Use the 4–8 digit PIN provided by your station administrator.</p>
            <div className="fs-keypad">
              {[1,2,3,4,5,6,7,8,9].map(n=><button type="button" disabled={busy} key={n} onClick={()=>setPin(p=>(p+n).slice(0,8))}>{n}</button>)}
              <button type="button" disabled={busy} className="fs-key-action" onClick={()=>setPin('')}>Clear</button>
              <button type="button" disabled={busy} onClick={()=>setPin(p=>(p+'0').slice(0,8))}>0</button>
              <button type="button" disabled={busy} className="fs-key-action" aria-label="Delete last digit" onClick={()=>setPin(p=>p.slice(0,-1))}>⌫</button>
            </div>
          </> : <div className="fs-email-fields">
            <label htmlFor="station-email">Email address</label>
            <input id="station-email" type="email" autoComplete="username" required disabled={busy} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@department.org" />
            <label htmlFor="station-password">Password</label>
            <input id="station-password" type="password" autoComplete="current-password" required disabled={busy} value={password} onChange={e=>setPassword(e.target.value)} />
          </div>}
          {error && <p className="fs-login-error" role="alert">{error}</p>}
          <button className="fs-login-submit" disabled={busy || (mode==='pin' && pin.length<4)} type="submit">{busy ? 'Signing in…' : 'Enter station portal'}<span aria-hidden="true">→</span></button>
        </form>
        <p className="fs-login-help">Need access? Contact your station administrator.</p>
      </section>
    </div>
    <footer className="fs-login-footer"><span>FIRESTATION COMMAND</span><span>Powered by Detroit Decal & Apparel</span></footer>
  </main>
}
