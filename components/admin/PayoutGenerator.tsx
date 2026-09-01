"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function PayoutGenerator({ campaignId }: { campaignId: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()

  async function generate() {
    if (!confirm("Generate a pending payout from currently unpaid campaign order items?")) return
    setBusy(true)
    setMessage("")

    try {
      const res = await fetch("/api/admin/payouts/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ campaignId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Payout generation failed")

      if (!json.created) {
        setMessage("No unpaid order items are available. Nothing was duplicated.")
      } else {
        setMessage(`Pending payout created: $${Number(json.payoutAmount).toFixed(2)} from ${json.itemCount} item(s).`)
      }

      router.refresh()
    } catch (e: any) {
      setMessage(e.message || "Payout generation failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fc-inline-actions">
      <button className="fc-btn fc-btn-primary" onClick={generate} disabled={busy}>
        {busy ? "Generating…" : "Generate Pending Payout"}
      </button>
      {message && <span className="fc-admin-message">{message}</span>}
    </div>
  )
}