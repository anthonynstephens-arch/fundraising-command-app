import {organizationAccess} from '@/lib/portal/organization-access'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
export async function POST(request: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Email sign-in required.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body?.campaignId || !/^[0-9a-f-]{36}$/i.test(body.campaignId)) return NextResponse.json({ error: 'Invalid collection.' }, { status: 400 })
  const db=createAdminClient()
  const {data:campaign}=await db.from('campaigns').select('organization_id').eq('id',body.campaignId).maybeSingle()
  const access=campaign?await organizationAccess(campaign.organization_id):null
  if(!access?.canFinance)return NextResponse.json({error:'Owner or admin access required.'},{status:403})
  if(access.org.require_details&&access.org.details_status!=='approved')return NextResponse.json({error:'Department details must be approved before requesting a payout.'},{status:403})
  const { data, error } = await db.rpc('request_station_payout', { target_campaign: body.campaignId, actor: user.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, requestId: data })
}
