import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {getPortalPinSession} from '@/lib/pin-auth'
export async function notificationIdentity(organizationId:string){
 if(!/^[0-9a-f-]{36}$/i.test(organizationId))return null
 const auth=await createClient()
 const [{data:{user}},pin]=await Promise.all([auth.auth.getUser(),getPortalPinSession()])
 const db=createAdminClient()
 if(pin?.organizationId===organizationId)return {db,identityType:'pin',identityId:pin.credentialId}
 if(!user)return null
 const [{data:platform},{data:member}]=await Promise.all([
 db.from('platform_admins').select('user_id').eq('user_id',user.id).eq('is_active',true).maybeSingle(),
 db.from('organization_members').select('id').eq('organization_id',organizationId).eq('user_id',user.id).maybeSingle()])
 return platform||member?{db,identityType:'user',identityId:user.id}:null
}
