import {NextResponse} from 'next/server'
import {requirePlatformAdmin} from '@/lib/admin/require-platform-admin'
import {createAdminClient} from '@/lib/supabase/admin'
import {departmentDetails} from '@/lib/portal/department-details'
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}})
export async function GET(request:Request){
 const gate=await requirePlatformAdmin();if(!gate.ok)return reply({error:'Unauthorized'},gate.status)
 try{return reply(await departmentDetails(createAdminClient(),new URL(request.url).searchParams.get('organizationId')||''))}catch{return reply({error:'Unable to load requirements.'},500)}
}
export async function POST(request:Request){
 const gate=await requirePlatformAdmin();if(!gate.ok)return reply({error:'Unauthorized'},gate.status)
 try{const b=await request.json();if(!Number.isInteger(b.version))return reply({error:'Reload before saving.'},400)
 const db=createAdminClient()
 let result
 if(b.action==='settings'){
  if(typeof b.requireDetails!=='boolean'||typeof b.isUnion!=='boolean')return reply({error:'Select department requirements and union status.'},400)
  result=await db.rpc('set_department_requirements',{input_org:b.organizationId,input_version:b.version,input_required:b.requireDetails,input_union:b.isUnion,input_actor:gate.user.id})
 }else{
  if(!['approved','changes_requested'].includes(b.status)||typeof b.note!=='string'||b.note.length>1000)return reply({error:'Invalid review.'},400)
  result=await db.rpc('review_department_details',{input_org:b.organizationId,input_version:b.version,input_status:b.status,input_note:b.note,input_actor:gate.user.id})
 }
 if(result.error)return reply({error:result.error.message},409)
 return reply({ok:true})
 }catch{return reply({error:'Unable to save department requirements.'},400)}
}
