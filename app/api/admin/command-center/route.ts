import {NextResponse} from 'next/server'
import {requirePlatformAdmin} from '@/lib/admin/require-platform-admin'
import {createAdminClient} from '@/lib/supabase/admin'
export async function GET(){
 const gate=await requirePlatformAdmin();if(!gate.ok)return NextResponse.json({error:'Unauthorized'},{status:gate.status})
 const {data,error}=await createAdminClient().rpc('command_center_snapshot')
 if(error)return NextResponse.json({error:'Unable to refresh the Command Center.'},{status:503})
 return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}})
}
