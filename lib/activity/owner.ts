import { requirePlatformAdmin } from '@/lib/admin/require-platform-admin'
// Bound to Anthony's verified auth identity, not a transferable admin role.
export const ACTIVITY_OWNER_ID = '4e9109ee-b524-4fbd-bc77-e31e0a97b510'
export async function canReadActivity() {
  const gate = await requirePlatformAdmin()
  return gate.ok && gate.user.id === ACTIVITY_OWNER_ID
}
