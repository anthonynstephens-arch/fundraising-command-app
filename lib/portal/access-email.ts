import {emailTransport,emailSender} from './email-transport'
import {defaultEmailDesign,renderEmail} from './email-template'
import { createAdminClient } from '@/lib/supabase/admin'
export async function deliverAccessEmails(credentialId?:string) {
 const db=createAdminClient()
 const {data:jobs,error}=await db.rpc('claim_portal_access_emails',{input_credential:credentialId||null})
 if(error)throw error
 const transport=emailTransport()
 let sent=0,failed=0
 for(const job of jobs||[]){
  try{
   const {data:credential,error:ce}=await db.from('portal_pin_credentials').select('organization_id,display_name').eq('id',job.credential_id).single()
   if(ce)throw ce
   const {data:org,error:oe}=await db.from('organizations').select('id,name,slug,logo_url').eq('id',credential.organization_id).single()
   if(oe)throw oe
   const category=job.kind==='approved'?'access_approved':'access_request'
   const {data:template,error:te}=await db.from('portal_email_templates').select('published').eq('category',category).maybeSingle()
   if(te)throw te
   const message=renderEmail(template?.published||defaultEmailDesign(category),{organization:org.name,logo:org.logo_url||'',name:credential.display_name,title:job.subject,body:job.body,href:job.kind==='approved'?'/departments/'+org.slug+'/login':'/portal/members?org='+org.id,settingsHref:'/portal/notifications?org='+org.id})
   await transport.sendMail({...emailSender(),to:job.recipient,...message,messageId:`<access-${job.id}@fundraisercommand.com>`})
   const {error:saveError}=await db.from('portal_access_email_queue').update({sent_at:new Date().toISOString(),last_error:null,lease_until:null}).eq('id',job.id)
   if(saveError)throw saveError
   sent++
  }catch{
   failed++
   await db.from('portal_access_email_queue').update({last_error:'Delivery failed; scheduled retry pending.'}).eq('id',job.id)
  }
 }
 transport.close()
 return {sent,failed}
}
