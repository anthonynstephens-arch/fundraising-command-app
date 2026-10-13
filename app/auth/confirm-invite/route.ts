import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {recordSignIn} from '@/lib/portal/sign-in-record'
export async function GET(request:Request){const url=new URL(request.url),token=url.searchParams.get('token_hash');if(token){const auth=await createClient(),{error}=await auth.auth.verifyOtp({token_hash:token,type:'invite'});if(!error){await recordSignIn().catch(()=>{});return NextResponse.redirect(new URL('/auth/invite',url.origin))}}return NextResponse.redirect(new URL('/auth/invite?error=Invitation%20expired',url.origin))}
