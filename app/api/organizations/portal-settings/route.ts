import {NextResponse} from 'next/server'
import {organizationAccess} from '@/lib/portal/organization-access'
export async function PATCH(request:Request){
 const b=await request.json(),a=await organizationAccess(b.organizationId)
 if(!a?.canFinance)return NextResponse.json({error:'Owner or admin access required.'},{status:403})
 if(typeof b.accessRequestsEnabled!=='boolean'||typeof b.primaryColor!=='string'||!/^#[0-9a-f]{6}$/i.test(b.primaryColor))return NextResponse.json({error:'Choose a valid brand color and access setting.'},{status:400})
 const {error}=await a.db.from('organizations').update({access_requests_enabled:b.accessRequestsEnabled,brand_primary_color:b.primaryColor}).eq('id',b.organizationId)
 return NextResponse.json(error?{error:'Unable to save settings.'}:{ok:true},{status:error?400:200})
}
