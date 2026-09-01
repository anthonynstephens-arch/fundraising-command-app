"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ApplicationActions({ applicationId, status }: { applicationId: string; status: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()

  if (status === "approved") return <span className="fc-status-pill approved">Approved</span>

  async function approve() {
    if (!confirm("Approve this application and create its organization and draft campaign?")) return
    setBusy(true)
    setMessage("")

    try {
      const res = await fetch("/api/admin/applications/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ applicationId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Approval failed")
      router.push(`/dashboard/campaigns/${json.campaignId}`)
      router.refresh()
    } catch (e: any) {
      setMessage(e.message || "Approval failed")
      setBusy(false)
    }
  }

  return (
    <div className="fc-inline-actions">
      <button className="fc-btn fc-btn-primary" onClick={approve} disabled={busy}>
        {busy ? "Approving…" : "Approve + Create Campaign"}
      </button>
      {message && <span className="fc-error">{message}</span>}
    </div>
  )
}