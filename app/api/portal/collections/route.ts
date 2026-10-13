import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPortalPinSession, PIN_COLLECTION_COOKIE } from '@/lib/pin-auth'

export const dynamic = 'force-dynamic'
async function accessible() {
  const auth = await createClient()
  const [{data:{user}}, pin] = await Promise.all([auth.auth.getUser(), getPortalPinSession({includeCollectionAccess:true})])
  if (!user && !pin) return null
  const db = createAdminClient()
  const [{data:platform,error:pe},{data:members,error:me}] = await Promise.all([
    user ? db.from('platform_admins').select('user_id').eq('user_id',user.id).eq('is_active',true).maybeSingle() : {data:null,error:null},
    user ? db.from('organization_members').select('organization_id').eq('user_id',user.id) : {data:[],error:null},
  ])
  if(pe || me) throw pe || me
  const orgIds = [...new Set([...(members||[]).map(m=>m.organization_id), ...(pin?[pin.homeOrganizationId]:[])])]
  let query = db.from('campaigns').select('id,name,organization_id,organizations!inner(name,is_active)').eq('organizations.is_active',true).order('name')
  const {data:home,error} = platform ? await query : orgIds.length ? await query.in('organization_id',orgIds) : {data:[],error:null}
  if(error) throw error
  const {data:grants,error:ge} = pin ? await db.from('portal_pin_campaign_access').select('campaign_id').eq('credential_id',pin.credentialId) : {data:[],error:null}
  if(ge) throw ge
  const ids=(grants||[]).map(g=>g.campaign_id)
  const {data:extra,error:ee}=ids.length ? await db.from('campaigns').select('id,name,organization_id,organizations!inner(name,is_active)').eq('organizations.is_active',true).in('id',ids) : {data:[],error:null}
  if(ee) throw ee
  const collections=[...new Map([...(home||[]),...(extra||[])].map((c:any)=>[c.id,{id:c.id,name:c.name,organizationId:c.organization_id,organizationName:(Array.isArray(c.organizations)?c.organizations[0]:c.organizations).name}])).values()]
  return {collections,pin}
}
export async function GET() {
  try { const result=await accessible(); return result ? NextResponse.json({collections:result.collections},{headers:{'Cache-Control':'no-store'}}) : NextResponse.json({error:'Sign in required.'},{status:401}) }
  catch { return NextResponse.json({error:'Unable to load assigned collections.'},{status:500}) }
}
export async function POST(request:Request) {
  try {
    const {campaignId}=await request.json()
    const result=await accessible()
    if(!result)return NextResponse.json({error:'Sign in required.'},{status:401})
    const collection=result.collections.find(c=>c.id===campaignId)
    if(!collection)return NextResponse.json({error:'This collection is not assigned to you.'},{status:403})
    // The cookie is only a selector: every request revalidates the live database grant.
    if(result.pin)(await cookies()).set(PIN_COLLECTION_COOKIE,collection.id,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:30*86400})
    return NextResponse.json({url:'/portal?org='+collection.organizationId+'&campaign='+collection.id})
  } catch { return NextResponse.json({error:'Unable to switch collections.'},{status:500}) }
}
