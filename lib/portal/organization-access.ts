import {assignedCampaignIds} from './collection-access'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {getPortalPinSession} from '@/lib/pin-auth'
import {resolvePortalContext} from '@/lib/portal/context'
export async function organizationAccess(organizationId:string, includeCollectionAccess=false){
 const db=createAdminClient(),auth=await createClient()
 const [{data:{user}},pin]=await Promise.all([auth.auth.getUser(),getPortalPinSession({includeCollectionAccess})])
 if(!user&&!pin)return null
 const [{data:platform},{data:memberships}]=await Promise.all([
  user?db.from('platform_admins').select('user_id').eq('user_id',user.id).eq('is_active',true).maybeSingle():Promise.resolve({data:null}),
  user?db.from('organization_members').select('organization_id,role').eq('user_id',user.id):Promise.resolve({data:[]})])
 const effective=[...(memberships||[])]
 if(includeCollectionAccess&&user&&!platform){const ids=await assignedCampaignIds(db,user.id);if(ids.length){const {data:grants}=await db.from('campaigns').select('organization_id').in('id',ids).eq('organization_id',organizationId);if(grants?.length&&!effective.some(m=>m.organization_id===organizationId))effective.push({organization_id:organizationId,role:'viewer'})}}
 const context=resolvePortalContext(organizationId,!!platform,effective,pin)
 if(context.denied)return null
 const {data:org}=await db.from('organizations').select('id,organization_type,is_active,require_details,details_status,is_union').eq('id',organizationId).maybeSingle()
 if(!org?.is_active)return null
 let designerFinance=false
 if(org.organization_type==='designer'&&context.usePin){
  const {data:permission,error}=await db.from('portal_pin_credentials').select('can_manage_payouts').eq('id',pin!.credentialId).eq('organization_id',organizationId).eq('active',true).maybeSingle()
  if(error)throw error
  designerFinance=permission?.can_manage_payouts===true
 }
 return {db,org,platform:!!platform,actor:context.usePin?`pin:${pin!.credentialId}`:`user:${user!.id}`,canManage:!!platform||['owner','admin','manager'].includes(context.role||''),canFinance:designerFinance||!!platform||['owner','admin'].includes(context.role||'')}
}
