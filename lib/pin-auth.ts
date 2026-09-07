import { createHash } from "crypto"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

export const PIN_COOKIE = "fundraiser_pin_session"

export type PortalPinSession = {
  sessionId: string
  credentialId: string
  organizationId: string
  displayName: string
  role: "owner" | "admin" | "manager" | "viewer"
  expiresAt: string
}

export async function getPortalPinSession(): Promise<PortalPinSession | null> {
  const token = (await cookies()).get(PIN_COOKIE)?.value
  if (!token) return null

  const tokenHash = createHash("sha256").update(token).digest("hex")
  const db = createAdminClient()
  const { data } = await db
    .from("portal_pin_sessions")
    .select(`
      id,
      expires_at,
      credential:portal_pin_credentials!inner(
        id,
        organization_id,
        display_name,
        role,
        active
      )
    `)
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()

  const credential = Array.isArray(data?.credential)
    ? data.credential[0]
    : data?.credential

  if (!data || !credential?.active) return null

  return {
    sessionId: data.id,
    credentialId: credential.id,
    organizationId: credential.organization_id,
    displayName: credential.display_name,
    role: credential.role,
    expiresAt: data.expires_at,
  }
}
