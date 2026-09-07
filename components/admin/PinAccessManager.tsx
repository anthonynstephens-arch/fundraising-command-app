"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Credential = {
  id: string
  display_name: string
  role: string
  active: boolean
  created_at: string
  loginCount: number
  lastLogin: string | null
}

export default function PinAccessManager({
  organizationId,
  credentials,
}: {
  organizationId: string
  credentials: Credential[]
}) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState("")
  const [role, setRole] = useState("viewer")
  const [pin, setPin] = useState("")
  const [busy, setBusy] = useState("")
  const [message, setMessage] = useState("")

  async function createCredential(event: React.FormEvent) {
    event.preventDefault()
    setBusy("create")
    setMessage("")
    const response = await fetch("/api/organizations/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, displayName, role, pin }),
    })
    const data = await response.json()
    setBusy("")
    if (!response.ok) {
      setMessage(data.error || "Unable to create PIN login.")
      return
    }
    setDisplayName("")
    setPin("")
    setRole("viewer")
    setMessage("PIN login created.")
    router.refresh()
  }

  async function setActive(id: string, active: boolean) {
    setBusy(id)
    setMessage("")
    const response = await fetch("/api/organizations/pins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    })
    const data = await response.json()
    setBusy("")
    if (!response.ok) {
      setMessage(data.error || "Unable to update PIN login.")
      return
    }
    router.refresh()
  }

  async function remove(id: string) {
    if (!confirm("Delete this PIN login and all of its active sessions?")) return
    setBusy(id)
    const response = await fetch("/api/organizations/pins", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    const data = await response.json()
    setBusy("")
    if (!response.ok) {
      setMessage(data.error || "Unable to delete PIN login.")
      return
    }
    router.refresh()
  }

  return <div className="fc-pin-manager">
    <form className="fc-member-add fc-pin-create" onSubmit={createCredential}>
      <div className="fc-member-field">
        <label>Person or access name</label>
        <input required minLength={2} placeholder="Chief Smith" value={displayName} onChange={event => setDisplayName(event.target.value)}/>
      </div>
      <div className="fc-member-field">
        <label>Access role</label>
        <select value={role} onChange={event => setRole(event.target.value)}>
          <option value="viewer">Viewer</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>
      </div>
      <div className="fc-member-field">
        <label>4–8 digit PIN</label>
        <input required type="password" inputMode="numeric" pattern="[0-9]{4,8}" minLength={4} maxLength={8} placeholder="••••" value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))}/>
      </div>
      <button className="fc-btn fc-btn-primary" disabled={busy === "create"}>{busy === "create" ? "Creating…" : "Create PIN Login"}</button>
    </form>
    <p className="fc-pin-help">Each PIN is unique, encrypted, tied to this department, and creates a 30-day secure session. Five failed attempts lock the device for 15 minutes.</p>
    {message && <div className="fc-note">{message}</div>}

    <div className="fc-table-scroll">
      <table className="fc-table">
        <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Last Login</th><th>Logins</th><th></th></tr></thead>
        <tbody>{credentials.map(credential =>
          <tr key={credential.id}>
            <td><strong>{credential.display_name}</strong><small className="fc-member-id">Created {new Date(credential.created_at).toLocaleDateString()}</small></td>
            <td><span className="fc-pill">{credential.role}</span></td>
            <td><span className={"fc-member-status " + (credential.active ? "active" : "pending")}>{credential.active ? "Active" : "Disabled"}</span></td>
            <td>{credential.lastLogin ? new Date(credential.lastLogin).toLocaleString() : "Never"}</td>
            <td>{credential.loginCount}</td>
            <td className="fc-table-action">
              <button className="fc-link-secondary" disabled={busy === credential.id} onClick={() => setActive(credential.id, !credential.active)}>{credential.active ? "Disable" : "Enable"}</button>
              <button className="fc-link-danger" disabled={busy === credential.id} onClick={() => remove(credential.id)}>Delete</button>
            </td>
          </tr>
        )}</tbody>
      </table>
      {!credentials.length && <div className="fc-empty">No PIN logins have been created for this department.</div>}
    </div>
  </div>
}
