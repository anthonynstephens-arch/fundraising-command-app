import { createHash } from "crypto"
import { cookies, headers } from "next/headers"
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPortalPinSession, PIN_COOKIE } from "@/lib/pin-auth"

export async function POST(request: Request) {
  try {
    const { pin } = await request.json()
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
    })
  } catch {
    return NextResponse.json(
      { error: "Unable to sign in with that PIN." },
      { status: 400 }
    )
  }
}

export async function DELETE() {
  const session = await getPortalPinSession()
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
  return NextResponse.json({ ok: true })
}
