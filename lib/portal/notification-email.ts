import {createAdminClient} from '@/lib/supabase/admin'
import {defaultEmailDesign,renderEmail,EmailCategory} from './email-template'
import {emailTransport,emailSender} from './email-transport'

export async function emailRecipients(db:ReturnType<typeof createAdminClient>,org:string,category:string,eventDate:string){
 const [{data:agency,error:ae},{data:members,error:me},{data:pins,error:pe},{data:prefs,error:pre}]=await Promise.all([
  db.from('organizations').select('id,name,logo_url,is_active').eq('id',org).single(),
  db.from('organization_members').select('user_id,created_at').eq('organization_id',org).lte('created_at',eventDate),
  db.from('portal_pin_credentials').select('id,email,display_name,created_at').eq('organization_id',org).eq('active',true).eq('access_status','approved').lte('created_at',eventDate),
  db.from('portal_notification_preferences').select('*').eq('organization_id',org)])
 if(ae||me||pe||pre)throw Error('Unable to resolve recipients.')
 if(!agency.is_active)return {agency,recipients:[]}
 const candidates:Array<{email:string;name:string;identity_type:string;identity_id:string}>=[]
 for(const m of members||[]){const {data,error}=await db.auth.admin.getUserById(m.user_id);if(error)throw Error('Unable to resolve member email.');if(data.user?.email&&data.user.email_confirmed_at)candidates.push({email:data.user.email,name:data.user.user_metadata?.full_name||data.user.email.split('@')[0],identity_type:'user',identity_id:m.user_id})}
 for(const p of pins||[])if(p.email)candidates.push({email:p.email,name:p.display_name,identity_type:'pin',identity_id:p.id})
 const blocked=new Set<string>(),unique=new Map<string,typeof candidates[number]>()
 for(const c of candidates){c.email=c.email.trim().toLowerCase();const pref=prefs?.find(p=>p.identity_type===c.identity_type&&p.identity_id===c.identity_id);if(pref?.email_enabled===false||pref?.[category]===false)blocked.add(c.email);else if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))unique.set(c.email,c)}
 return {agency,recipients:[...unique.values()].filter(c=>!blocked.has(c.email))}
}
export async function deliverNotificationEmails(){
 const db=createAdminClient(),started=Date.now()
 const {data:events,error}=await db.rpc('claim_notification_email_events');if(error)throw error
 for(const event of events||[]){
  if(Date.now()-started>18000)break
  try{
   const {recipients}=await emailRecipients(db,event.organization_id,event.category,event.created_at)
   if(recipients.length){const {error}=await db.from('portal_notification_emails').upsert(recipients.map(r=>({event_id:event.id,organization_id:event.organization_id,recipient:r.email,identity_type:r.identity_type,identity_id:r.identity_id})),{onConflict:'event_id,recipient',ignoreDuplicates:true});if(error)throw error}
   const {error}=await db.from('portal_notification_events').update({email_enqueued_at:new Date().toISOString(),email_lease_until:null}).eq('id',event.id).eq('email_lease_until',event.email_lease_until);if(error)throw error
  }catch{console.error('Notification email recipient resolution failed',event.id)}
 }
 await db.from('portal_notification_emails').update({status:'failed',last_error:'Delivery did not finish after five attempts. Retry from Email Studio.'}).eq('status','sending').gte('attempts',5).lt('lease_until',new Date().toISOString())
 const {data:jobs,error:claimError}=await db.rpc('claim_notification_emails');if(claimError)throw claimError
 const transport=emailTransport();let sent=0,failed=0,skipped=0
 const resolved=new Map<string,Awaited<ReturnType<typeof emailRecipients>>>(),designs=new Map<string,any>()
 try{for(const job of jobs||[]){
  if(Date.now()-started>43000){await db.from('portal_notification_emails').update({status:'queued',attempts:job.attempts-1,lease_until:null}).eq('id',job.id).eq('lease_token',job.lease_token);continue}
  const update=async(values:any)=>{const {error}=await db.from('portal_notification_emails').update({...values,lease_until:null}).eq('id',job.id).eq('lease_token',job.lease_token);if(error)throw error}
  try{
   const {data:event,error}=await db.from('portal_notification_events').select('*').eq('id',job.event_id).single();if(error)throw error
   if(!resolved.has(event.id))resolved.set(event.id,await emailRecipients(db,job.organization_id,event.category,event.created_at))
   const {agency,recipients}=resolved.get(event.id)!
   const recipient=recipients.find(r=>r.email===job.recipient)
   if(!recipient){await update({status:'skipped',last_error:'Recipient no longer eligible or opted out.'});skipped++;continue}
   if(!designs.has(event.category)){const {data:template,error:te}=await db.from('portal_email_templates').select('published').eq('category',event.category).maybeSingle();if(te)throw te;designs.set(event.category,template?.published||defaultEmailDesign(event.category as EmailCategory))}
   const message=renderEmail(designs.get(event.category),{organization:agency.name,logo:agency.logo_url||'',name:recipient.name,title:event.title,body:event.body,href:event.href,settingsHref:'/portal/notifications?org='+agency.id})
   await transport.sendMail({...emailSender(),to:recipient.email,...message,messageId:`<notification-${job.id}@fundraisercommand.com>`})
   await update({status:'sent',sent_at:new Date().toISOString(),last_error:null});sent++
  }catch{failed++;await update({status:job.attempts>=5?'failed':'queued',last_error:job.attempts>=5?'Delivery failed after five attempts. Check the email connection and retry.':'Delivery failed. Automatic retry scheduled.',next_attempt_at:new Date(Date.now()+Math.min(60,2**job.attempts)*60000).toISOString()})}
 }}finally{transport.close()}
 return {sent,failed,skipped}
}
