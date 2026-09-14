import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requirePlatformAdmin } from '@/lib/admin/require-platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { validReportingDate } from '@/lib/portal/reporting-period'
export async function POST(request:Request) {
  const gate=await requirePlatformAdmin()
  if(!gate.ok)return NextResponse.json({error:'Platform administrator access required.'},{status:gate.status})
  try {
    const {organizationId,startDate}=await request.json()
    if(typeof organizationId!=='string'||(startDate!==null&&!validReportingDate(startDate)))
      return NextResponse.json({error:'Choose a valid start date on or before today.'},{status:400})
    const db=createAdminClient()
    const {data,error}=await db.from('organizations').update({reporting_start_date:startDate}).eq('id',organizationId).select('id').maybeSingle()
    if(error)throw error
    if(!data)return NextResponse.json({error:'Department not found.'},{status:404})
    revalidatePath('/station','layout');revalidatePath('/portal','layout');revalidatePath('/dashboard','layout')
    return NextResponse.json({ok:true})
  } catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:'Unable to save reporting date.'},{status:400})
  }
}
