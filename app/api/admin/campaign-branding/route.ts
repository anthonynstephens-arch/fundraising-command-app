import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin"

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status })

  try {
    const body = await request.json()
    const id = String(body.id || "")
    if (!id) return NextResponse.json({ error: "Missing campaign ID" }, { status: 400 })

    const startRaw = typeof body.starts_at === "string" ? body.starts_at.trim() : ""
    const endRaw = typeof body.ends_at === "string" ? body.ends_at.trim() : ""
    if (!startRaw || !endRaw) return NextResponse.json({ error: "Campaign start and end dates are required." }, { status: 400 })

    const start = new Date(startRaw + "T00:00:00")
    const end = new Date(endRaw + "T23:59:59")
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return NextResponse.json({ error: "Enter valid campaign dates." }, { status: 400 })
    if (end.getTime() < start.getTime()) return NextResponse.json({ error: "Campaign end date must be after the start date." }, { status: 400 })

    const allowed = {
      name: typeof body.name === "string" ? body.name.trim().slice(0, 180) : undefined,
      description: typeof body.description === "string" ? body.description.trim().slice(0, 4000) : undefined,
      goal_amount: Number.isFinite(Number(body.goal_amount)) ? Number(body.goal_amount) : undefined,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      public_store_url: typeof body.public_store_url === "string" ? body.public_store_url.trim() || null : undefined,
      custom_domain: typeof body.custom_domain === "string" ? body.custom_domain.trim() || null : undefined,
      hero_image_url: typeof body.hero_image_url === "string" ? body.hero_image_url.trim() || null : undefined,
    }

    const update = Object.fromEntries(Object.entries(allowed).filter(([, v]) => v !== undefined))
    const supabase = createAdminClient()
    const { error } = await supabase.from("campaigns").update(update).eq("id", id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unable to update campaign" }, { status: 500 })
  }
}