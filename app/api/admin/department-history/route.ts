import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requirePlatformAdmin } from '@/lib/admin/require-platform-admin'
import { importDepartmentHistory } from '@/lib/shopify/import-history'
import { reportingDay,validReportingDate } from '@/lib/portal/reporting-period'
export const maxDuration=300
export async function POST(request:Request) {
  const gate=await requirePlatformAdmin()
  if(!gate.ok)return NextResponse.json({error:'Platform administrator access required.'},{status:gate.status})
  try{
    const {organizationId,cursor=null,startDate=null,through=reportingDay()}=await request.json()
    if(typeof organizationId!=='string'||(cursor!==null&&typeof cursor!=='string')||
      (startDate!==null&&!validReportingDate(startDate))||!validReportingDate(through))
      return NextResponse.json({error:'Invalid import request.'},{status:400})
    const result=await importDepartmentHistory(organizationId,cursor,startDate,through)
    revalidatePath('/station','layout');revalidatePath('/portal','layout');revalidatePath('/dashboard','layout')
    return NextResponse.json(result)
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:'Historical import failed. Retry to safely resume.'},{status:400})
  }
}
