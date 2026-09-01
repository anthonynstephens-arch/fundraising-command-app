import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin"

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70)
}

function campaignName(type: string | null, org: string) {
  const v = (type || "fundraiser").toLowerCase()
  if (v === "breast-cancer-awareness") return "Breast Cancer Awareness Fundraiser"
  if (v === "movember") return "Movember Fundraiser"
  if (v === "autism-awareness") return "Autism Awareness Fundraiser"
  if (v === "department-store") return `${org} Store`
  return `${org} Fundraiser`
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status })

  try {
    const { applicationId } = await request.json()
    if (!applicationId) return NextResponse.json({ error: "Missing application ID" }, { status: 400 })

    const db = createAdminClient()
    const { data: app, error: appError } = await db.from("applications").select("*").eq("id", applicationId).maybeSingle()
    if (appError) throw appError
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 })

    let organizationId = app.organization_id

    if (!organizationId) {
      let orgSlug = slugify(app.organization_name || "organization")
      const { data: existing } = await db.from("organizations").select("id").eq("slug", orgSlug).maybeSingle()
      if (existing) orgSlug = `${orgSlug}-${Date.now().toString().slice(-5)}`

      const { data: org, error: orgError } = await db.from("organizations").insert({
        name: app.organization_name,
        slug: orgSlug,
        organization_type: app.organization_type,
        contact_name: app.contact_name,
        contact_email: app.contact_email,
        contact_phone: app.contact_phone,
        is_active: true,
      }).select("id").single()

      if (orgError) throw orgError
      organizationId = org.id
    }

    const name = campaignName(app.requested_campaign_type, app.organization_name)
    let campaignSlug = slugify(name)
    const { data: existingCampaign } = await db.from("campaigns").select("id").eq("organization_id", organizationId).eq("slug", campaignSlug).maybeSingle()
    if (existingCampaign) campaignSlug = `${campaignSlug}-${Date.now().toString().slice(-5)}`

    const { data: campaign, error: campaignError } = await db.from("campaigns").insert({
      organization_id: organizationId,
      name,
      slug: campaignSlug,
      campaign_type: app.requested_campaign_type || "fundraiser",
      description: app.message || null,
      status: "draft",
      goal_amount: 0,
    }).select("id").single()

    if (campaignError) throw campaignError

    const { error: updateError } = await db.from("applications").update({
      status: "approved",
      organization_id: organizationId,
      updated_at: new Date().toISOString(),
    }).eq("id", applicationId)

    if (updateError) throw updateError

    return NextResponse.json({ ok: true, organizationId, campaignId: campaign.id })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unable to approve application" }, { status: 500 })
  }
}