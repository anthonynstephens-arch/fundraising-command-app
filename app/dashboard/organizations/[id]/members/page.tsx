import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MemberRoleControl from '@/components/MemberRoleControl'

export default async function MembersPage({
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
    .select('id,name')
    .eq('id', id)
    .single()

  if (!organization) notFound()

  const { data: members, error } = await supabase
    .from('organization_members')
    .select('id,user_id,role,created_at')
    .eq('organization_id', id)
    .order('created_at')

  return (
    <main className="dash">
      

      <section>
        <header>
          <div>
            <div className="eyebrow">ORGANIZATION ACCESS</div>
            <h2>Members</h2>
            <p className="subtle">{organization.name}</p>
          </div>
        </header>

        <div className="panel">
          <h3>Organization members</h3>
          <p>
            Control the role assigned to each Fundraising Command user in this
            organization.
          </p>

          {error ? (
            <p className="error">{error.message}</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Role</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {(members || []).map((member) => (
                    <tr key={member.id}>
                      <td className="mono">{member.user_id}</td>
                      <td>
                        <MemberRoleControl
                          membershipId={member.id}
                          role={member.role}
                        />
                      </td>
                      <td>
                        {new Date(member.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}