import {POST as saveUserAccess} from '@/app/api/admin/users/route'
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
  return NextResponse.json({campaigns:campaigns||[],assigned:(grants||[]).map(g=>g.campaign_id)})
}
export async function POST(request:Request) {
  const gate=await requirePlatformAdmin()
  if(!gate.ok)return NextResponse.json({error:'Platform administrator required.'},{status:gate.status})
  const {credentialId,campaignId,assigned}=await request.json()
  if(typeof credentialId!=='string'||typeof campaignId!=='string'||typeof assigned!=='boolean')return NextResponse.json({error:'Invalid assignment.'},{status:400})
  return saveUserAccess(new Request(request.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'pin',identityId:credentialId,campaignId,assigned})}))
}
