"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

export function CreateOrganizationForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage("")
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form).entries())

    try {
      const response = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Unable to create organization.")
      router.push(`/dashboard/organizations/${data.organizationId}`)
      router.refresh()
    } catch (error: any) {
      setMessage(error?.message || "Unable to create organization.")
      setBusy(false)
    }
  }

  return (
    <form className="fc-organization-form" onSubmit={submit}>
      <div className="fc-organization-fields">
        <label>
          Organization name
          <input name="name" required minLength={2} maxLength={120} placeholder="Example: Riverview Public Safety" />
        </label>
        <label>
          Organization type
          <select name="organizationType" defaultValue="other" required>
            <option value="fire">Fire Department</option>
            <option value="police">Police Department</option>
            <option value="ems">EMS</option>
            <option value="school">School</option>
            <option value="nonprofit">Nonprofit</option>
            <option value="business">Business / Organization</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Contact name
          <input name="contactName" maxLength={120} placeholder="Primary contact" />
        </label>
        <label>
          Contact email
          <input name="contactEmail" type="email" maxLength={254} placeholder="name@example.com" />
        </label>
        <label>
          Contact phone
          <input name="contactPhone" type="tel" maxLength={40} placeholder="(555) 555-5555" />
        </label>
        <label>
          Website
          <input name="websiteUrl" type="url" maxLength={500} placeholder="https://example.com" />
        </label>
      </div>
      <div className="fc-organization-form-actions">
        {message && <span className="fc-error" role="alert">{message}</span>}
        <button className="fc-btn fc-btn-primary" disabled={busy}>
          {busy ? "Creating…" : "Create organization"}
        </button>
      </div>
    </form>
  )
}

export function DeleteOrganizationButton({ organizationId, organizationName }: { organizationId: string; organizationName: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  async function remove() {
    const confirmationName = prompt(`This permanently deletes ${organizationName} and its campaigns, orders, payouts, and access.\n\nType the full organization name to continue:`)
    if (confirmationName === null) return
    if (confirmationName.trim() !== organizationName) {
      setMessage("The organization name did not match. Nothing was deleted.")
      return
    }

    setBusy(true)
    setMessage("")
    try {
      const response = await fetch("/api/admin/organizations", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId, confirmationName: confirmationName.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Unable to delete organization.")
      router.push("/dashboard/organizations")
      router.refresh()
    } catch (error: any) {
      setMessage(error?.message || "Unable to delete organization.")
      setBusy(false)
    }
  }

  return (
    <div className="fc-delete-organization">
      <div>
        <h2>Delete organization</h2>
        <p>Permanently remove this organization and all connected campaigns, orders, payouts, and access.</p>
      </div>
      <div className="fc-delete-organization-action">
        {message && <span className="fc-error" role="alert">{message}</span>}
        <button type="button" className="fc-btn fc-btn-danger" onClick={remove} disabled={busy}>
          {busy ? "Deleting…" : "Delete organization"}
        </button>
      </div>
    </div>
  )
}
