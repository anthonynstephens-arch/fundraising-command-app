import {NextResponse} from 'next/server'
import {requirePlatformAdmin} from '@/lib/admin/require-platform-admin'
import {createAdminClient} from '@/lib/supabase/admin'
export async function POST(request:Request){
 const gate=await requirePlatformAdmin();if(!gate.ok)return NextResponse.json({error:'Unauthorized'},{status:gate.status})
 const body=await request.json()
 if(!Number.isInteger(body.version)||!['approved','changes_requested'].includes(body.status)||typeof body.note!=='string'||body.note.length>1000)return NextResponse.json({error:'Invalid review.'},{status:400})
 const {error}=await createAdminClient().rpc('review_payout_profile',{input_org:body.organizationId,input_version:body.version,input_status:body.status,input_note:body.note,input_actor:gate.user.id})
 if(error)return NextResponse.json({error:error.message.includes('Profile changed')?'Payment details changed or were already reviewed. Reload before reviewing.':'Could not save review. Include a note when requesting changes.'},{status:409})
 return NextResponse.json({ok:true})
}
