import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
export async function recordSignIn(){
 const auth=await createClient(),{data:{user}}=await auth.auth.getUser();if(!user)return false
 const {data:{session}}=await auth.auth.getSession();if(!session)return false
 const claims=JSON.parse(Buffer.from(session.access_token.split('.')[1],'base64url').toString())
 if(claims.sub!==user.id||typeof claims.session_id!=='string')return false
 const {error}=await createAdminClient().from('portal_user_sign_ins').upsert({user_id:user.id,session_id:claims.session_id},{onConflict:'session_id',ignoreDuplicates:true})
 if(error)throw error;return true
}
