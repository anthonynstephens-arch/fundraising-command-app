import { createClient } from "@/lib/supabase/server"

export async function requirePlatformAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, user: null }

  const { data: admin } = await supabase
    .from("platform_admins")
    .select("role,is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()

  if (!admin) return { ok: false as const, status: 403, user }
  return { ok: true as const, status: 200, user, role: admin.role }
}