import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {recordSignIn} from '@/lib/portal/sign-in-record'
const types=['signup','invite','magiclink','recovery','email_change','email'] as const
export async function GET(request:Request){
 const url=new URL(request.url),token=url.searchParams.get('token_hash'),type=url.searchParams.get('type')
 if(token&&types.includes(type as typeof types[number])){
  const auth=await createClient(),{error}=await auth.auth.verifyOtp({token_hash:token,type:type as typeof types[number]})
  if(!error){await recordSignIn().catch(()=>{});return NextResponse.redirect(new URL(type==='recovery'||type==='invite'?'/auth/invite':'/home',url.origin))}
 }
 return NextResponse.redirect(new URL('/auth/invite?error=This%20email%20link%20is%20invalid%20or%20expired.',url.origin))
}
