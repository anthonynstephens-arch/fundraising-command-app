'use client'

import { useEffect, useState } from 'react'

type Preferences = {
  email_enabled: boolean
  browser_enabled: boolean
  in_app_enabled: boolean
  new_sales: boolean
  payout_updates: boolean
  campaign_milestones: boolean
  sync_issues: boolean
}

const defaults: Preferences = { email_enabled: true, browser_enabled: false, in_app_enabled: true, new_sales: true, payout_updates: true, campaign_milestones: true, sync_issues: true }

export default function PortalNotificationSettings({ organizationId, userEmail }: { organizationId: string; userEmail: string }) {
  const [preferences, setPreferences] = useState(defaults)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/portal/preferences?organizationId=' + encodeURIComponent(organizationId))
      .then(response => response.json())
      .then(data => setPreferences(current => ({ ...current, ...(data.preferences || {}) })))
      .catch(() => setMessage('Unable to load notification settings.'))
  }, [organizationId])

  async function toggle(key: keyof Preferences) {
    let value = !preferences[key]
    if (key === 'browser_enabled' && value && 'Notification' in window) {
      value = (await Notification.requestPermission()) === 'granted'
      if (!value) setMessage('Browser notifications were not allowed on this device.')
    }
    setPreferences(current => ({ ...current, [key]: value }))
  }

  async function save() {
    setSaving(true); setMessage('')
    const response = await fetch('/api/portal/preferences', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ organizationId, ...preferences }) })
    const data = await response.json()
    setSaving(false)
    setMessage(response.ok ? 'Notification preferences saved.' : data.error || 'Unable to save notification settings.')
  }

  const rows: Array<[keyof Preferences, string, string]> = [
    ['new_sales', 'New sales', 'An order is recorded for your campaign.'],
    ['campaign_milestones', 'Campaign milestones', 'Your fundraiser reaches an important goal.'],
    ['payout_updates', 'Payout updates', 'A payout is requested, approved, processed, or paid.'],
    ['sync_issues', 'Shopify sync issues', 'Fundraiser Command needs attention syncing store data.'],
  ]

  return <section className="agency-card portal-notifications">
    <header><div><h2>Notification Settings</h2><p>Choose how and when Fundraiser Command should alert you.</p></div></header>
    <div className="portal-notification-section"><h3>Delivery methods</h3>
      <label><span><b>In-app notifications</b><small>Show updates while using Fundraiser Command.</small></span><input type="checkbox" checked={preferences.in_app_enabled} onChange={() => toggle('in_app_enabled')}/></label>
      <label><span><b>Email notifications</b><small>{userEmail.includes('@') ? `Send alerts to ${userEmail}.` : 'Available when an email account is connected.'}</small></span><input type="checkbox" checked={preferences.email_enabled} onChange={() => toggle('email_enabled')}/></label>
      <label><span><b>Device notifications</b><small>Allow browser alerts on this phone or computer.</small></span><input type="checkbox" checked={preferences.browser_enabled} onChange={() => toggle('browser_enabled')}/></label>
    </div>
    <div className="portal-notification-section"><h3>Alert me about</h3>{rows.map(([key, title, description]) => <label key={key}><span><b>{title}</b><small>{description}</small></span><input type="checkbox" checked={preferences[key]} onChange={() => toggle(key)}/></label>)}</div>
    <div className="portal-home-screen"><b>Add Fundraiser Command to your Home Screen</b><p><strong>iPhone:</strong> tap Share, then <em>Add to Home Screen</em>. <strong>Android:</strong> open the browser menu and select <em>Add to Home screen</em> or <em>Install app</em>.</p></div>
    <div className="portal-notification-save"><button type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Notification Settings'}</button>{message && <span role="status">{message}</span>}</div>
  </section>
}
