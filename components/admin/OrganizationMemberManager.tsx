"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Member={id:string;user_id:string;role:string;created_at:string;email?:string|null;confirmed?:boolean}

export default function OrganizationMemberManager({organizationId,members}:{organizationId:string;members:Member[]}){
  const router=useRouter()
  const [email,setEmail]=useState("")
  const [role,setRole]=useState("viewer")
  const [busy,setBusy]=useState("")
  const [message,setMessage]=useState("")

  async function addMember(e:React.FormEvent){
    e.preventDefault()
    setBusy("add");setMessage("")
    const res=await fetch("/api/organizations/members",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({organizationId,email,role})})
    const data=await res.json()
    if(!res.ok){setMessage(data.error||"Unable to add member.");setBusy("");return}
    setMessage(data.invited?"Invite sent and member assigned.":"Member assigned.")
    setEmail("");setRole("viewer");setBusy("");router.refresh()
  }

  async function updateRole(membershipId:string,newRole:string){
    setBusy(membershipId);setMessage("")
    const res=await fetch("/api/organizations/members",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({organizationId,membershipId,role:newRole})})
    const data=await res.json()
    setBusy("")
    if(!res.ok){setMessage(data.error||"Unable to update role.");return}
    router.refresh()
  }

  async function resend(m:Member){
    if(!m.email) return
    setBusy("resend-"+m.id);setMessage("")
    const res=await fetch("/api/organizations/members",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"resend",organizationId,membershipId:m.id,email:m.email,role:m.role})})
    const data=await res.json()
    setBusy("")
    if(!res.ok){setMessage(data.error||"Unable to resend invite.");return}
    setMessage("Fresh invitation sent to "+m.email+".")
    router.refresh()
  }

  async function remove(membershipId:string){
    if(!confirm("Remove this person from the organization?")) return
    setBusy(membershipId);setMessage("")
    const res=await fetch("/api/organizations/members",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({organizationId,membershipId})})
    const data=await res.json()
    setBusy("")
    if(!res.ok){setMessage(data.error||"Unable to remove member.");return}
    router.refresh()
  }

  return <div className="fc-member-manager">
    <form className="fc-member-add" onSubmit={addMember}>
      <div className="fc-member-field">
        <label>Email address</label>
        <input type="email" required placeholder="name@department.gov" value={email} onChange={e=>setEmail(e.target.value)}/>
      </div>
      <div className="fc-member-field">
        <label>Access role</label>
        <select value={role} onChange={e=>setRole(e.target.value)}>
          <option value="viewer">Viewer</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>
      </div>
      <button className="fc-btn fc-btn-primary" disabled={busy==="add"}>{busy==="add"?"Adding…":"Add Member"}</button>
    </form>
    <div className="fc-role-help">
      <span><b>Owner</b> full control</span><span><b>Admin</b> members + campaigns</span><span><b>Manager</b> campaign operations</span><span><b>Viewer</b> reports only</span>
    </div>
    {message&&<div className="fc-note">{message}</div>}

    <div className="fc-table-scroll">
      <table className="fc-table">
        <thead><tr><th>Member</th><th>Role</th><th>Added</th><th></th></tr></thead>
        <tbody>
          {members.map(m=><tr key={m.id}>
            <td><strong>{m.email||m.user_id}</strong>{m.email&&<small className="fc-member-id">{m.user_id}</small>}<span className={"fc-member-status "+(m.confirmed?"active":"pending")}>{m.confirmed?"Active":"Invite pending"}</span></td>
            <td>
              <select className="fc-inline-select" value={m.role} disabled={busy===m.id} onChange={e=>updateRole(m.id,e.target.value)}>
                <option value="owner">Owner</option><option value="admin">Admin</option><option value="manager">Manager</option><option value="viewer">Viewer</option>
              </select>
            </td>
            <td>{new Date(m.created_at).toLocaleDateString()}</td>
            <td className="fc-table-action">{!m.confirmed&&<button className="fc-link-secondary" type="button" disabled={busy==="resend-"+m.id} onClick={()=>resend(m)}>{busy==="resend-"+m.id?"Sending…":"Resend Invite"}</button>}<button className="fc-link-danger" type="button" disabled={busy===m.id} onClick={()=>remove(m.id)}>Remove</button></td>
          </tr>)}
        </tbody>
      </table>
      {!members.length&&<div className="fc-empty">No members are assigned yet.</div>}
    </div>
  </div>
}