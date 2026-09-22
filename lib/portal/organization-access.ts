import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {getPortalPinSession} from '@/lib/pin-auth'
import {resolvePortalContext} from '@/lib/portal/context'
export async function organizationAccess(organizationId:string){
 const db=createAdminClient(),auth=await createClient()
 const [{data:{user}},pin]=await Promise.all([auth.auth.getUser(),getPortalPinSession()])
 if(!user&&!pin)return null
 const [{data:platform},{data:memberships}]=await Promise.all([
  user?db.from('platform_admins').select('user_id').eq('user_id',user.id).eq('is_active',true).maybeSingle():Promise.resolve({data:null}),
  user?db.from('organization_members').select('organization_id,role').eq('user_id',user.id):Promise.resolve({data:[]})])
 const context=resolvePortalContext(organizationId,!!platform,memberships||[],pin)
 if(context.denied)return null
 const {data:org}=await db.from('organizations').select('id,organization_type,is_active').eq('id',organizationId).maybeSingle()
 if(!org?.is_active)return null
 return {db,org,platform:!!platform,actor:context.usePin?`pin:${pin!.credentialId}`:`user:${user!.id}`,canManage:!!platform||['owner','admin','manager'].includes(context.role||''),canFinance:!!platform||['owner','admin'].includes(context.role||'')}
}
