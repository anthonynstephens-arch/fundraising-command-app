import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/admin/require-platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
export async function GET(request:Request) {
  const gate=await requirePlatformAdmin()
  if(!gate.ok)return NextResponse.json({error:'Platform administrator required.'},{status:gate.status})
  const id=new URL(request.url).searchParams.get('credentialId')
  if(!id)return NextResponse.json({error:'PIN user required.'},{status:400})
  const db=createAdminClient()
  const [{data:credential,error:ce},{data:campaigns,error:ca},{data:grants,error:ge}]=await Promise.all([
    db.from('portal_pin_credentials').select('organization_id').eq('id',id).maybeSingle(),
    db.from('campaigns').select('id,name,organization_id,organizations!inner(name,is_active)').eq('organizations.is_active',true).order('name'),
    db.from('portal_pin_campaign_access').select('campaign_id').eq('credential_id',id),
  ])
  if(ce||ca||ge)return NextResponse.json({error:'Unable to load assignments.'},{status:500})
  if(!credential)return NextResponse.json({error:'PIN user not found.'},{status:404})
  return NextResponse.json({campaigns:(campaigns||[]).filter(c=>c.organization_id!==credential.organization_id),assigned:(grants||[]).map(g=>g.campaign_id)})
}
export async function POST(request:Request) {
  const gate=await requirePlatformAdmin()
  if(!gate.ok)return NextResponse.json({error:'Platform administrator required.'},{status:gate.status})
  const {credentialId,campaignId,assigned}=await request.json()
  if(typeof credentialId!=='string'||typeof campaignId!=='string'||typeof assigned!=='boolean')return NextResponse.json({error:'Invalid assignment.'},{status:400})
  const db=createAdminClient()
  const {error}=assigned ? await db.from('portal_pin_campaign_access').upsert({credential_id:credentialId,campaign_id:campaignId},{onConflict:'credential_id,campaign_id'}) : await db.from('portal_pin_campaign_access').delete().eq('credential_id',credentialId).eq('campaign_id',campaignId)
  if(error)return NextResponse.json({error:'Unable to save assignment.'},{status:400})
  return NextResponse.json({ok:true})
}
