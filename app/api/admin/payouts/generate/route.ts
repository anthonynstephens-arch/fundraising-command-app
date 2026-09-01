import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin"

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status })

  try {
    const { campaignId } = await request.json()
    if (!campaignId) return NextResponse.json({ error: "Missing campaign ID" }, { status: 400 })

    const db = createAdminClient()
    const { data, error } = await db.rpc("generate_campaign_payout", {
      target_campaign: campaignId,
    })

    if (error) throw error
    const payout = Array.isArray(data) ? data[0] : data

    if (!payout) {
      return NextResponse.json({
        ok: true,
        created: false,
        message: "No unpaid campaign order items are available.",
      })
    }

    return NextResponse.json({
      ok: true,
      created: true,
      payoutId: payout.payout_id,
      grossSales: Number(payout.gross_sales || 0),
      contribution: Number(payout.contribution_amount || 0),
      refunded: Number(payout.refunded_contribution || 0),
      payoutAmount: Number(payout.payout_amount || 0),
      itemCount: Number(payout.item_count || 0),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unable to generate payout" }, { status: 500 })
  }
}