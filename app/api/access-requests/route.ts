import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeOrganizationManagement } from '@/lib/portal/authorize-organization-management'
import { deliverAccessEmails } from '@/lib/portal/access-email'
export const maxDuration=60
export async function POST(request:Request){
 try{
  const {name,email,pin,website,organizationSlug}=await request.json()
  if(website)return NextResponse.json({ok:true})
  if(typeof name!=='string'||name.trim().length<2||name.length>100||typeof email!=='string'||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof pin!=='string'||!/^\d{4,8}$/.test(pin))return NextResponse.json({error:'Enter your name, valid email, and a 4–8 digit PIN.'},{status:400})
  const fingerprint=createHash('sha256').update(request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown').digest('hex')
  const db=createAdminClient()
  const {data:org,error:orgError}=await db.from('organizations').select('id').eq('slug',typeof organizationSlug==='string'?organizationSlug:'plymouth-township-fire-department').eq('is_active',true).eq('access_requests_enabled',true).single()
  if(orgError||!org)throw new Error('Department unavailable')
  const {data:members,error:membersError}=await db.from('organization_members').select('user_id').eq('organization_id',org.id).in('role',['owner','admin'])
  if(membersError)throw membersError
  const owners=await Promise.all((members||[]).map(async member=>{
   const {data,error}=await db.auth.admin.getUserById(member.user_id)
   if(error)throw error
   return data.user?.email
  }))
  const {data,error}=await db.rpc('request_department_access',{input_org:org.id,input_name:name.trim(),input_email:email.toLowerCase().trim(),input_pin:pin,input_fingerprint:fingerprint,input_recipients:owners.filter(Boolean)})
  if(error?.message.includes('Too many'))return NextResponse.json({error:'Too many requests. Please try again in an hour.'},{status:429})
  if(error)return NextResponse.json({error:error.message.includes('different PIN')?'Please choose a different PIN.':'Unable to submit your request. Please try again later.'},{status:400})
  if(data)after(async()=>{await deliverAccessEmails(data)})
  return NextResponse.json({ok:true})
 }catch{return NextResponse.json({error:'Unable to submit your request.'},{status:400})}
}
export async function PATCH(request:Request){
 try{
  const {id}=await request.json()
  if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'Invalid request.'},{status:400})
  const db=createAdminClient()
  const {data:credential,error}=await db.from('portal_pin_credentials').select('organization_id').eq('id',id).maybeSingle()
  if(error||!credential)return NextResponse.json({error:'Request not found.'},{status:404})
  const auth=await authorizeOrganizationManagement(credential.organization_id)
  if(!auth.ok||(!auth.platform&&!['owner','admin'].includes(auth.role||'')))return NextResponse.json({error:'Only an owner or admin can approve access.'},{status:403})
  const {error:approveError}=await db.rpc('approve_portal_access',{input_id:id})
  if(approveError)return NextResponse.json({error:'Unable to approve this request.'},{status:400})
  after(async()=>{await deliverAccessEmails(id)})
  return NextResponse.json({ok:true})
 }catch{return NextResponse.json({error:'Unable to approve this request.'},{status:400})}
}

export async function GET(request:Request){
 const slug=new URL(request.url).searchParams.get('slug')||''
 const {data}=await createAdminClient().from('organizations').select('access_requests_enabled').eq('slug',slug).eq('is_active',true).maybeSingle()
 return NextResponse.json({enabled:!!data?.access_requests_enabled},{headers:{'Cache-Control':'no-store'}})
}
