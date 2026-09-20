import { NextResponse } from "next/server"
import { getPortalPinSession } from "@/lib/pin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const session = await getPortalPinSession({ allowPendingPinChange: true })
    if (!session) {
      return NextResponse.json({ error: "Your sign-in has expired. Enter your issued PIN again." }, { status: 401 })
    }

    const { pin } = await request.json()
    if (typeof pin !== "string" || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ error: "Choose a 4–8 digit PIN." }, { status: 400 })
    }

    const db = createAdminClient()
    const { error } = await db.rpc("change_portal_pin", {
      input_credential_id: session.credentialId,
      input_new_pin: pin,
    })
    if (error) {
      return NextResponse.json({ error: error.message || "Unable to save that PIN." }, { status: 400 })
    }

    // Keep this browser signed in while invalidating older sessions for the issued PIN.
    await db
      .from("portal_pin_sessions")
      .delete()
      .eq("credential_id", session.credentialId)
      .neq("id", session.sessionId)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Unable to save that PIN." }, { status: 400 })
  }
}
