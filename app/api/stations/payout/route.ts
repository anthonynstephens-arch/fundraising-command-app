import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
export async function POST(request: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Email sign-in required.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body?.campaignId || !/^[0-9a-f-]{36}$/i.test(body.campaignId)) return NextResponse.json({ error: 'Invalid collection.' }, { status: 400 })
  const { data, error } = await createAdminClient().rpc('request_station_payout', { target_campaign: body.campaignId, actor: user.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, requestId: data })
}
