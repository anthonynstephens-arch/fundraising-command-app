'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Organization = {
  id: string
  name: string
}

export default function NewCampaignPage() {
  const router = useRouter()
  const supabase = createClient()

  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [organizationId, setOrganizationId] = useState('')
  const [name, setName] = useState('')
  const [campaignType, setCampaignType] = useState('fundraiser')
  const [description, setDescription] = useState('')
  const [goal, setGoal] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadOrganizations() {
      const { data } = await supabase
        .from('organizations')
        .select('id,name')
        .eq('is_active', true)
        .order('name')

      setOrganizations(data || [])

      if (data?.length === 1) {
        setOrganizationId(data[0].id)
      }
    }

    loadOrganizations()
  }, [])

  function makeSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!organizationId) {
      setError('Select an organization.')
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        organization_id: organizationId,
        name,
        slug: makeSlug(name),
        campaign_type: campaignType,
        description,
        status: 'draft',
        goal_amount: Number(goal || 0),
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      })
      .select('id')
      .single()

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push(`/dashboard/campaigns/${data.id}`)
    router.refresh()
  }

  return (
    <main className="dash">
      

      <section>
        <header>
          <div>
            <div className="eyebrow">NEW CAMPAIGN</div>
            <h2>Create Campaign</h2>
          </div>
        </header>

        <form className="form-panel" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Organization
              <select
                required
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
              >
                <option value="">Select organization</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Campaign type
              <select
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value)}
              >
                <option value="fundraiser">Fundraiser</option>
                <option value="breast-cancer-awareness">
                  Breast Cancer Awareness
                </option>
                <option value="movember">Movember</option>
                <option value="autism-awareness">
                  Autism Awareness
                </option>
                <option value="department-store">
                  Department Store
                </option>
                <option value="school">School</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="full">
              Campaign name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Example: PTFD October Fundraiser"
              />
            </label>

            <label className="full">
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the fundraiser..."
                rows={5}
              />
            </label>

            <label>
              Fundraising goal
              <input
                type="number"
                min="0"
                step="0.01"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="5000"
              />
            </label>

            <div />

            <label>
              Start date
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </label>

            <label>
              End date
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </label>
          </div>

          {error && <p className="error">{error}</p>}

          <div className="form-actions">
            <Link href="/dashboard/campaigns" className="secondary">
              Cancel
            </Link>

            <button className="primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}