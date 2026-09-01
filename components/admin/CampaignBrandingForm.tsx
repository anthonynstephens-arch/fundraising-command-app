"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

function toDateInput(value:any){
  if(!value) return ""
  const d=new Date(value)
  if(Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0,10)
}

export default function CampaignBrandingForm({ campaign }: { campaign: any }) {
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setMessage("")
    const form = new FormData(e.currentTarget)
    const payload = Object.fromEntries(form.entries())

    try {
      const res = await fetch("/api/admin/campaign-branding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: campaign.id, ...payload }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Save failed")
      setMessage("✓ Campaign settings saved")
      router.refresh()
    } catch (e: any) {
      setMessage(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="fc-admin-form">
      <div className="fc-admin-grid">
        <label>Public campaign name<input name="name" defaultValue={campaign.name || ""} required /></label>
        <label>Goal amount<input name="goal_amount" type="number" min="0" step="0.01" defaultValue={campaign.goal_amount || 0} /></label>

        <label>
          Campaign start date
          <input name="starts_at" type="date" defaultValue={toDateInput(campaign.starts_at)} required />
        </label>
        <label>
          Campaign end date
          <input name="ends_at" type="date" defaultValue={toDateInput(campaign.ends_at)} required />
        </label>

        <label className="fc-span-2">Description<textarea name="description" rows={4} defaultValue={campaign.description || ""} /></label>
        <label className="fc-span-2">Shopify collection URL<input name="public_store_url" type="url" defaultValue={campaign.public_store_url || ""} /></label>
        <label>Hero image URL<input name="hero_image_url" type="url" defaultValue={campaign.hero_image_url || ""} /></label>
        <label>Custom domain<input name="custom_domain" placeholder="fundraiser.example.org" defaultValue={campaign.custom_domain || ""} /></label>
      </div>
      <div className="fc-admin-actions">
        <button className="fc-btn fc-btn-primary" disabled={saving}>{saving ? "Saving…" : "Save Campaign Settings"}</button>
        <a href={`/fundraisers/${campaign.slug}`} target="_blank" className="fc-btn">Preview Public Campaign ↗</a>
      </div>
      {message && <p className="fc-admin-message">{message}</p>}
    </form>
  )
}