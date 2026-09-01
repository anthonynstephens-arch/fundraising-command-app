'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MemberRoleControl({
  membershipId,
  role,
}: {
  membershipId: string
  role: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [value, setValue] = useState(role)
  const [saving, setSaving] = useState(false)

  async function updateRole(newRole: string) {
    setValue(newRole)
    setSaving(true)

    const { error } = await supabase
      .from('organization_members')
      .update({ role: newRole })
      .eq('id', membershipId)

    setSaving(false)

    if (!error) router.refresh()
  }

  return (
    <select
      className="small-select"
      value={value}
      disabled={saving}
      onChange={(e) => updateRole(e.target.value)}
    >
      <option value="owner">Owner</option>
      <option value="admin">Admin</option>
      <option value="manager">Manager</option>
      <option value="viewer">Viewer</option>
    </select>
  )
}