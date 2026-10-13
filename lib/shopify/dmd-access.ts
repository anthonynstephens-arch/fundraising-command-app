import {assignedCampaignIds} from '@/lib/portal/collection-access'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {getPortalPinSession} from '@/lib/pin-auth'
import {DMD_ORGANIZATION_ID} from './dmd-private'

export async function hasDmdPortalAccess(){
  const pin=await getPortalPinSession()
  if(pin?.organizationId===DMD_ORGANIZATION_ID&&pin.campaignIds?.length)return true
  const auth=await createClient()
  const {data:{user}}=await auth.auth.getUser()
  if(!user)return false
  const db=createAdminClient()
  const [{data:membership},{data:admin}]=await Promise.all([
    db.from('organization_members').select('organization_id').eq('organization_id',DMD_ORGANIZATION_ID).eq('user_id',user.id).maybeSingle(),
    db.from('platform_admins').select('is_active').eq('user_id',user.id).eq('is_active',true).maybeSingle()
  ])
  if(admin)return true
  if(!membership)return false
  const ids=await assignedCampaignIds(db,user.id)
  if(!ids.length)return false
  const {data:campaigns,error}=await db.from('campaigns').select('id').eq('organization_id',DMD_ORGANIZATION_ID).in('id',ids).limit(1)
  if(error)throw error
  return !!campaigns?.length
}
