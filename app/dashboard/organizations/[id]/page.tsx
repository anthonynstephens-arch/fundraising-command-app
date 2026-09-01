import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: organization } = await supabase
    .from('organizations')
    .select(
      'id,name,slug,organization_type,contact_name,contact_email,contact_phone,logo_url,website_url,is_active,created_at'
    )
    .eq('id', id)
    .single()

  if (!organization) notFound()

  const [
    { data: campaigns },
    { data: orders },
    { data: payouts },
    { count: memberCount },
  ] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id,name,status,goal_amount')
      .eq('organization_id', id),

    supabase
      .from('orders')
      .select('id,total,status')
      .eq('organization_id', id),

    supabase
      .from('payouts')
      .select('id,payout_amount,status')
      .eq('organization_id', id),

    supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', id),
  ])

  const grossSales = (orders || []).reduce(
    (total, order) => total + Number(order.total || 0),
    0
  )

  const payoutTotal = (payouts || []).reduce(
    (total, payout) => total + Number(payout.payout_amount || 0),
    0
  )

  return (
    <main className="dash">
      

      <section>
        <header>
          <div>
            <div className="eyebrow">ORGANIZATION</div>
            <h2>{organization.name}</h2>
          </div>

          <div className="user">{user.email}</div>
        </header>

        <div className="stats">
          <Stat label="Campaigns" value={campaigns?.length || 0} />
          <Stat label="Members" value={memberCount || 0} />
          <Stat label="Gross sales" value={`$${grossSales.toFixed(2)}`} />
          <Stat label="Payouts" value={`$${payoutTotal.toFixed(2)}`} />
        </div>

        <div className="page-actions">
          <div>
            <h3>Organization administration</h3>
            <p>Manage access and organization settings.</p>
          </div>
          <Link href={`/dashboard/organizations/${organization.id}/members`} className="primary">
            Manage Members
          </Link>
        </div>

        <div className="panel">
          <h3>Organization details</h3>

          <p>
            <strong>Type:</strong>{' '}
            {organization.organization_type || 'Organization'}
          </p>

          <p>
            <strong>Status:</strong>{' '}
            {organization.is_active ? 'Active' : 'Inactive'}
          </p>

          {organization.website_url && (
            <p>
              <strong>Website:</strong> {organization.website_url}
            </p>
          )}

          {organization.contact_name && (
            <p>
              <strong>Contact:</strong> {organization.contact_name}
            </p>
          )}

          {organization.contact_email && (
            <p>
              <strong>Email:</strong> {organization.contact_email}
            </p>
          )}

          {organization.contact_phone && (
            <p>
              <strong>Phone:</strong> {organization.contact_phone}
            </p>
          )}
        </div>

        <div className="panel">
          <h3>Campaigns</h3>

          {campaigns?.length ? (
            campaigns.map((campaign) => (
              <div key={campaign.id}>
                <strong>{campaign.name}</strong>
                <p>Status: {campaign.status}</p>
              </div>
            ))
          ) : (
            <p>No campaigns yet.</p>
          )}
        </div>
      </section>
    </main>
  )
}

function Stat({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}