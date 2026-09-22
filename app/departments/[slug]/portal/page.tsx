import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPortalPinSession } from '@/lib/pin-auth'
import { resolvePortalContext } from '@/lib/portal/context'
export const dynamic = 'force-dynamic'
export default async function Page({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params
  const auth = await createClient()
  const [{ data: { user } }, pin] = await Promise.all([
    auth.auth.getUser(), getPortalPinSession({ allowPendingPinChange: true }),
  ])
  if (!user && !pin) redirect('/departments/'+encodeURIComponent(slug)+'/login')
  const db = createAdminClient()
  const { data: org, error } = await db.from('organizations').select('id,organization_type').eq('slug', slug).eq('is_active', true).maybeSingle()
  if (error) throw error
  if (!org) notFound()
  const [{ data: platform }, { data: memberships }] = await Promise.all([
    user ? db.from('platform_admins').select('user_id').eq('user_id', user.id).eq('is_active', true).maybeSingle() : Promise.resolve({ data: null }),
    user ? db.from('organization_members').select('organization_id,role').eq('user_id', user.id) : Promise.resolve({ data: [] }),
  ])
  const context = resolvePortalContext(org.id, !!platform, memberships || [], pin)
  if (context.denied) notFound()
  if (context.usePin && pin?.mustChangePin) redirect('/change-pin')
  // Shared portal pages and APIs independently enforce organization membership.
  redirect(org.organization_type === 'detroit_fire_station' ? '/station/' + org.id : '/portal?org=' + encodeURIComponent(org.id))
}
