import { NextResponse } from "next/server"
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin"
import { createAdminClient } from "@/lib/supabase/admin"

const ORGANIZATION_TYPES = new Set(["fire", "police", "ems", "school", "nonprofit", "business", "other"])

function text(value: unknown, maxLength: number) {
  const normalized = typeof value === "string" ? value.trim() : ""
  return normalized ? normalized.slice(0, maxLength) : null
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
}

async function uniqueSlug(name: string) {
  const db = createAdminClient()
  const base = slugify(name) || "organization"
  const { data: existing, error } = await db.from("organizations").select("slug").like("slug", `${base}%`)
  if (error) throw error
  const used = new Set((existing || []).map((row) => row.slug))
  if (!used.has(base)) return base

  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}-${index}`
    if (!used.has(candidate)) return candidate
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status })

  try {
    const body = await request.json()
    const name = text(body.name, 120)
    const organizationType = text(body.organizationType, 40) || "other"
    const contactName = text(body.contactName, 120)
    const contactEmail = text(body.contactEmail, 254)?.toLowerCase() || null
    const contactPhone = text(body.contactPhone, 40)
    const websiteUrl = text(body.websiteUrl, 500)

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Enter an organization name." }, { status: 400 })
    }
    if (!ORGANIZATION_TYPES.has(organizationType)) {
      return NextResponse.json({ error: "Select a valid organization type." }, { status: 400 })
    }
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json({ error: "Enter a valid contact email." }, { status: 400 })
    }
    if (websiteUrl) {
      try {
        const url = new URL(websiteUrl)
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error()
      } catch {
        return NextResponse.json({ error: "Website must be a full http:// or https:// address." }, { status: 400 })
      }
    }

    const db = createAdminClient()
    const slug = await uniqueSlug(name)
    const { data: organization, error } = await db
      .from("organizations")
      .insert({
        name,
        slug,
        organization_type: organizationType,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        website_url: websiteUrl,
        is_active: true,
      })
      .select("id")
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, organizationId: organization.id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unable to create organization." }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status })

  try {
    const body = await request.json()
    const organizationId = text(body.organizationId, 80)
    const confirmationName = text(body.confirmationName, 120)
    if (!organizationId || !confirmationName) {
      return NextResponse.json({ error: "Organization and confirmation name are required." }, { status: 400 })
    }

    const db = createAdminClient()
    const { data: organization, error: lookupError } = await db
      .from("organizations")
      .select("id,name")
      .eq("id", organizationId)
      .maybeSingle()

    if (lookupError) throw lookupError
    if (!organization) return NextResponse.json({ error: "Organization not found." }, { status: 404 })
    if (confirmationName !== organization.name) {
      return NextResponse.json({ error: "The organization name did not match." }, { status: 400 })
    }

    const { data: deleted, error } = await db.rpc("delete_organization_and_data", {
      p_organization_id: organizationId,
    })
    if (error) throw error
    if (!deleted) return NextResponse.json({ error: "Organization not found." }, { status: 404 })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unable to delete organization." }, { status: 500 })
  }
}
