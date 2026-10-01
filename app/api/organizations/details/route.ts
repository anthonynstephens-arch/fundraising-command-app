import {NextResponse} from 'next/server'
import {organizationAccess} from '@/lib/portal/organization-access'
import {departmentDetails} from '@/lib/portal/department-details'
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}})
export async function GET(request:Request){
 try{const id=new URL(request.url).searchParams.get('organizationId')||'',access=await organizationAccess(id)
 if(!access)return reply({error:'Unauthorized'},403)
 return reply({...await departmentDetails(access.db,id),canSubmit:access.canFinance})
 }catch{return reply({error:'Unable to load department requirements.'},500)}
}
export async function POST(request:Request){
 try{const body=await request.json(),access=await organizationAccess(body.organizationId)
 if(!access?.canFinance)return reply({error:'A department owner or admin must submit the details.'},403)
 if(!Number.isInteger(body.version))return reply({error:'Reload before submitting.'},400)
 const {error}=await access.db.rpc('submit_department_details',{input_org:body.organizationId,input_version:body.version,input_actor:access.actor})
 if(error)return reply({error:error.message},409)
 return reply({ok:true})
 }catch{return reply({error:'Unable to submit details.'},400)}
}
