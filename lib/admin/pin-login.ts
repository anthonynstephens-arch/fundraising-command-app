import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// Called only after portal_pin_login has verified the PIN and its rate limit.
// Bindings are service-only records, separate from editable department roles.
export async function establishPinIdentity(credentialId: string) {
  const db = createAdminClient()
  const { data: binding, error } = await db.from('platform_admin_pin_credentials')
    .select('user_id').eq('credential_id', credentialId).maybeSingle()
  if (error) throw error
  const auth = await createClient()
  // A shared browser must never carry owner privileges into a member PIN login.
  const { error: signOutError } = await auth.auth.signOut({ scope: 'local' })
  if (signOutError) throw signOutError
  if (!binding) return false

  const { data: admin, error: adminError } = await db.from('platform_admins')
    .select('user_id').eq('user_id', binding.user_id).eq('is_active', true).maybeSingle()
  if (adminError) throw adminError
  if (!admin) throw new Error('Administrator access is inactive.')
  const { data: account, error: accountError } = await db.auth.admin.getUserById(admin.user_id)
  if (accountError || !account.user?.email) throw new Error('Administrator account unavailable.')
  // Exchange a server-generated one-time token for a normal Supabase session.
  // No email is sent; tokens remain server-side. Existing RLS and admin checks apply.
  const { data: link, error: linkError } = await db.auth.admin.generateLink({ type: 'magiclink', email: account.user.email })
  if (linkError || !link.properties?.hashed_token || link.user?.id !== admin.user_id) throw new Error('Unable to start administrator session.')
  const { data: verified, error: verifyError } = await auth.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'email' })
  if (verifyError || verified.user?.id !== admin.user_id) {
    await auth.auth.signOut({ scope: 'local' })
    throw new Error('Unable to verify administrator session.')
  }
  return true
}
