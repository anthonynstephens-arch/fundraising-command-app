import { establishPinIdentity } from "@/lib/admin/pin-login"
import { createClient } from "@/lib/supabase/server"
import { createHash } from "crypto"
import { cookies, headers } from "next/headers"
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPortalPinSession, PIN_COOKIE } from "@/lib/pin-auth"

export async function POST(request: Request) {
  try {
    const { pin, organizationSlug } = await request.json()
    if (typeof pin !== "string" || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json(
        { error: "Enter a 4–8 digit PIN." },
        { status: 400 }
      )
    }

    const requestHeaders = await headers()
    const fingerprint = [
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
      requestHeaders.get("user-agent") || "unknown",
    ].join("|")

    const db = createAdminClient()
    const { data, error } = await db.rpc("portal_pin_login", {
      input_pin: pin,
      input_fingerprint: fingerprint,
    })

    if (error || !data?.[0]?.session_token) {
      return NextResponse.json(
        { error: error?.message || data?.[0]?.error_message || "Incorrect PIN." },
        { status: 401 }
      )
    }

    const result = data[0]
    const platformAdmin = await establishPinIdentity(result.credential_id)
    if (organizationSlug && !platformAdmin) {
      const { data: org } = await db.from("organizations").select("id").eq("slug", organizationSlug).eq("is_active", true).maybeSingle()
      if (!org || org.id !== result.organization_id) {
        await db.from("portal_pin_sessions").delete().eq("token_hash", createHash("sha256").update(result.session_token).digest("hex"))
        return NextResponse.json({ error: "This PIN does not have access to this department." }, { status: 403 })
      }
    }
    const { data: credential, error: credentialError } = await db
      .from("portal_pin_credentials")
      .select("must_change_pin")
      .eq("id", result.credential_id)
      .single()
    if (credentialError) throw credentialError
    const cookieStore = await cookies()
    cookieStore.set(PIN_COOKIE, result.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(result.expires_at),
    })

    return NextResponse.json({
      ok: true,
      organizationId: result.organization_id,
      displayName: result.display_name,
      redirectTo: platformAdmin ? "/dashboard" : "/portal",
      mustChangePin: !platformAdmin && credential.must_change_pin,
    })
  } catch {
    return NextResponse.json(
      { error: "Unable to sign in with that PIN." },
      { status: 400 }
    )
  }
}

export async function DELETE() {
  const session = await getPortalPinSession({ allowPendingPinChange: true })
  const db = createAdminClient()
  if (session) {
    await db.from("portal_pin_sessions").delete().eq("id", session.sessionId)
  }
  const cookieStore = await cookies()
  const token = cookieStore.get(PIN_COOKIE)?.value
  if (token && !session) {
    const tokenHash = createHash("sha256").update(token).digest("hex")
    await db.from("portal_pin_sessions").delete().eq("token_hash", tokenHash)
  }
  cookieStore.delete(PIN_COOKIE)
  const auth = await createClient()
  const { error: signOutError } = await auth.auth.signOut({ scope: "local" })
  if (signOutError) return NextResponse.json({ error: "Unable to finish signing out." }, { status: 500 })
  return NextResponse.json({ ok: true })
}
