'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const steps = [
  { title: 'Welcome to Fundraiser Command', body: 'This portal gives your team live campaign sales, fundraising totals, orders, products, and payout information.', action: 'Start tour' },
  { title: 'Set your campaign goals', body: 'Open Campaign Progress to set fundraising and sales goals, then track exactly how close your department is to each target.', href: '/portal/progress', action: 'View Campaign Progress' },
  { title: 'Track progress and payouts', body: 'Use Campaign Progress for performance and Payouts to see earned, pending, available, and paid funds.', href: '/portal/payouts', action: 'View Payouts' },
  { title: 'Choose your notifications', body: 'Select alerts for new sales, campaign milestones, payout updates, and Shopify sync issues.', href: '/portal/notifications', action: 'Notification Settings' },
  { title: 'Add the app to your Home Screen', body: 'On iPhone: tap Share, then Add to Home Screen. On Android: open the browser menu and tap Add to Home screen or Install app.', action: 'Finish' },
]

export default function PortalOnboarding({ organizationId, query }: { organizationId: string; query: string }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    let active = true
    fetch('/api/portal/preferences?organizationId=' + encodeURIComponent(organizationId))
      .then(response => response.json())
      .then(data => { if (active && !data.preferences?.onboarding_completed_at) setOpen(true) })
      .catch(() => {})
    return () => { active = false }
  }, [organizationId])

  async function finish() {
    setOpen(false)
    await fetch('/api/portal/preferences', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ organizationId, onboardingCompleted: true }),
    })
  }

  if (!open) return null
  const current = steps[step]
  const href = current.href ? current.href + query : null

  return <div className="portal-tour-backdrop" role="presentation">
    <section className="portal-tour" role="dialog" aria-modal="true" aria-labelledby="portal-tour-title">
      <div className="portal-tour-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>{steps.map((_, index) => <i key={index} className={index <= step ? 'active' : ''}/>)}</div>
      <span className="portal-tour-step">STEP {step + 1} OF {steps.length}</span>
      <h2 id="portal-tour-title">{current.title}</h2>
      <p>{current.body}</p>
      <div className="portal-tour-actions">
        {step > 0 && <button type="button" className="secondary" onClick={() => setStep(value => value - 1)}>Back</button>}
        {href && <Link href={href} onClick={() => setOpen(false)}>{current.action}</Link>}
        {step < steps.length - 1 && <button type="button" onClick={() => setStep(value => value + 1)}>{step === 0 ? current.action : 'Next'}</button>}
        {step === steps.length - 1 && <button type="button" onClick={finish}>{current.action}</button>}
      </div>
      <button type="button" className="portal-tour-skip" onClick={finish}>Skip tutorial</button>
    </section>
  </div>
}
