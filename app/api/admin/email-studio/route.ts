import {NextResponse} from 'next/server'
import {requirePlatformAdmin} from '@/lib/admin/require-platform-admin'
import {createAdminClient} from '@/lib/supabase/admin'
import {emailCategories,validateEmailDesign,renderEmail} from '@/lib/portal/email-template'
import {emailConfigured,emailSender,emailTransport} from '@/lib/portal/email-transport'
const response=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})
export async function GET(){
 const gate=await requirePlatformAdmin();if(!gate.ok)return response({error:'Platform administrator access required.'},gate.status)
 const db=createAdminClient()
 const [{data:templates,error},{data:deliveries,error:de},{data:organizations,error:oe}]=await Promise.all([
  db.from('portal_email_templates').select('*'),db.from('portal_notification_emails').select('id,recipient,status,attempts,last_error,created_at,sent_at').order('created_at',{ascending:false}).limit(30),db.from('organizations').select('id,name,logo_url').eq('is_active',true).order('name')])
 if(error||de||oe)return response({error:'Unable to load Email Studio.'},503)
 return response({templates,deliveries,organizations,configured:emailConfigured(),testEmail:gate.user.email||''})
}
export async function POST(request:Request){
 const gate=await requirePlatformAdmin();if(!gate.ok)return response({error:'Platform administrator access required.'},gate.status)
 try{
  const body=await request.json(),db=createAdminClient()
  if(body.action==='verify'){
   const transport=emailTransport();try{await transport.verify();return response({ok:true,message:'Email server connection and authentication verified.'})}finally{transport.close()}
  }
  if(body.action==='retry'){
   const {error}=await db.from('portal_notification_emails').update({status:'queued',attempts:0,lease_until:null,next_attempt_at:new Date().toISOString(),last_error:null}).eq('id',body.id).eq('status','failed');if(error)throw error;return response({ok:true})
  }
  if(!Object.hasOwn(emailCategories,body.category))return response({error:'Choose an email category.'},400)
  const design=validateEmailDesign(body.design)
  if(body.action==='test'){
   if(!gate.user.email||!gate.user.email_confirmed_at)return response({error:'A verified account email is required for test delivery.'},400)
   const {data:org}=body.organizationId?await db.from('organizations').select('name,logo_url').eq('id',body.organizationId).maybeSingle():{data:null}
   const message=renderEmail(design,{organization:org?.name||'Your department',logo:org?.logo_url||'',name:'Anthony',title:emailCategories[body.category as keyof typeof emailCategories],body:'This is a preview from Email Studio. Your design will be filled with live department activity when published.',href:'/dashboard'})
   const transport=emailTransport();try{await transport.sendMail({...emailSender(),to:gate.user.email,...message,subject:'[Preview] '+message.subject});return response({ok:true,message:'Preview sent to '+gate.user.email})}finally{transport.close()}
  }
  if(!['save','publish'].includes(body.action)||!Number.isInteger(body.version))return response({error:'Reload before saving.'},400)
  const {data:version,error}=await db.rpc('save_email_template',{input_category:body.category,input_design:design,input_version:body.version,input_publish:body.action==='publish',input_actor:gate.user.id})
  if(error)return response({error:error.message.includes('Template changed')?'This template changed in another session. Reload before saving.':'Unable to save template.'},409)
  return response({ok:true,version})
 }catch(error){return response({error:error instanceof Error&& !('code' in error)?error.message:'Email operation failed. Check the email connection and try again.'},400)}
}
