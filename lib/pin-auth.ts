import { createHash } from "crypto"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

import { pinCollectionContext } from "@/lib/portal/pin-collection-context"

export const PIN_COLLECTION_COOKIE = "fundraiser_pin_collection"
export const PIN_COOKIE = "fundraiser_pin_session"

export type PortalPinSession = {
  sessionId: string
  credentialId: string
  organizationId: string
  displayName: string
  role: "owner" | "admin" | "manager" | "viewer"
  homeOrganizationId: string
  delegated: boolean
  campaignIds: string[] | null
  expiresAt: string
  mustChangePin: boolean
}

export async function getPortalPinSession({ allowPendingPinChange = false, includeCollectionAccess = false } = {}): Promise<PortalPinSession | null> {
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
        active,
        must_change_pin
      )
    `)
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()

  const credential = Array.isArray(data?.credential)
    ? data.credential[0]
    : data?.credential

  if (!data || !credential?.active || (credential.must_change_pin && !allowPendingPinChange)) return null

  const selected = includeCollectionAccess ? (await cookies()).get(PIN_COLLECTION_COOKIE)?.value : undefined
  const { data: grants, error: grantError } = await db.from("portal_pin_campaign_access")
    .select("campaign:campaigns!inner(id,organization_id)").eq("credential_id", credential.id)
  if (grantError) throw grantError
  const assigned = (grants || []).flatMap((row: any) => Array.isArray(row.campaign) ? row.campaign : [row.campaign])
  const context = pinCollectionContext(credential.organization_id, credential.role, selected, includeCollectionAccess ? assigned : assigned.filter((c:any)=>c.organization_id===credential.organization_id))
  return {
    homeOrganizationId: credential.organization_id,
    delegated: context.delegated,
    campaignIds: context.campaignIds,
    sessionId: data.id,
    credentialId: credential.id,
    organizationId: context.organizationId,
    displayName: credential.display_name,
    role: context.role as PortalPinSession["role"],
    expiresAt: data.expires_at,
    mustChangePin: credential.must_change_pin,
  }
}
