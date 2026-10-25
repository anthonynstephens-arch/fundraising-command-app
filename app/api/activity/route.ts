import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPortalPinSession } from '@/lib/pin-auth'
const kinds = ['page_view','download','request']
export async function POST(req:NextRequest) {
  if(req.headers.get('origin') !== req.nextUrl.origin) return new NextResponse(null,{status:403})
  if(Number(req.headers.get('content-length')||0)>4096) return new NextResponse(null,{status:413})
  try {
    const body=await req.json()
    if(!kinds.includes(body.kind)||typeof body.path!=='string'||!body.path.startsWith('/')||body.path.length>500) return new NextResponse(null,{status:400})
    const auth=await createClient()
    const {data:{user}}=await auth.auth.getUser()
    const pin=user?null:await getPortalPinSession({includeCollectionAccess:true})
    if(!user&&!pin) return new NextResponse(null,{status:401})
    const {error}=await createAdminClient().from('portal_activity_log').insert({
      actor_id:user?.id||`pin:${pin!.credentialId}`,actor_name:user?.email||pin!.displayName,
      auth_type:user?'account':'pin',organization_id:pin?.organizationId||null,
      kind:body.kind,path:body.path.split('?')[0],
      detail:typeof body.detail==='string'?body.detail.slice(0,300):'',
      context:typeof body.context==='string'?body.context.slice(0,200):'',
      source:'browser',
    })
    return new NextResponse(null,{status:error?503:204})
  } catch { return new NextResponse(null,{status:400}) }
}
