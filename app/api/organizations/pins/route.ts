import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const roles = new Set(["owner", "admin", "manager", "viewer"])

async function requirePlatformAdmin() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return false
  const db = createAdminClient()
  const { data } = await db
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()
  return !!data
}

export async function GET(request: Request) {
  if (!await requirePlatformAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const organizationId = new URL(request.url).searchParams.get("organizationId")
  if (!organizationId) {
    return NextResponse.json({ error: "Organization is required." }, { status: 400 })
  }

  const db = createAdminClient()
  const { data: credentials, error } = await db
    .from("portal_pin_credentials")
    .select("id,display_name,role,active,created_at")
    .eq("organization_id", organizationId)
    .order("created_at")
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const ids = (credentials || []).map((credential) => credential.id)
  const { data: events } = ids.length
    ? await db
      .from("portal_pin_login_events")
      .select("credential_id,logged_in_at")
      .in("credential_id", ids)
      .order("logged_in_at", { ascending: false })
    : { data: [] as any[] }

  const stats = new Map<string, { loginCount: number; lastLogin: string | null }>()
  for (const event of events || []) {
    const current = stats.get(event.credential_id) || { loginCount: 0, lastLogin: null }
    current.loginCount += 1
    current.lastLogin ||= event.logged_in_at
    stats.set(event.credential_id, current)
  }

  return NextResponse.json({
    credentials: (credentials || []).map((credential) => ({
      ...credential,
      ...(stats.get(credential.id) || { loginCount: 0, lastLogin: null }),
    })),
  })
}

export async function POST(request: Request) {
  if (!await requirePlatformAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { organizationId, displayName, role, pin } = await request.json()
  if (!organizationId || typeof displayName !== "string" || !roles.has(role) || !/^\d{4,8}$/.test(pin || "")) {
    return NextResponse.json({ error: "Enter a name, role, and a 4–8 digit PIN." }, { status: 400 })
  }
  const db = createAdminClient()
  const { data, error } = await db.rpc("create_portal_pin_credential", {
    input_organization_id: organizationId,
    input_display_name: displayName,
    input_role: role,
    input_pin: pin,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data })
}

export async function PATCH(request: Request) {
  if (!await requirePlatformAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id, active } = await request.json()
  if (!id || typeof active !== "boolean") {
    return NextResponse.json({ error: "Invalid PIN login update." }, { status: 400 })
  }
  const db = createAdminClient()
  const { error } = await db
    .from("portal_pin_credentials")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!active) await db.from("portal_pin_sessions").delete().eq("credential_id", id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  if (!await requirePlatformAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: "PIN login is required." }, { status: 400 })
  const db = createAdminClient()
  const { error } = await db.from("portal_pin_credentials").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
