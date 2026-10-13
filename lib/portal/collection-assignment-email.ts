import {createAdminClient} from '@/lib/supabase/admin'
import {emailTransport,emailSender} from './email-transport'
import {defaultEmailDesign,renderEmail} from './email-template'
export async function deliverCollectionAssignmentEmails(){
 const db=createAdminClient(),{data:jobs,error}=await db.rpc('claim_collection_assignment_emails');if(error)throw error
 let sent=0,failed=0;const transport=emailTransport()
 try{for(const job of jobs||[]){try{
  const {data:grant,error:ge}=await db.from(job.identity_type==='pin'?'portal_pin_campaign_access':'portal_user_campaign_access').select('campaign_id').eq(job.identity_type==='pin'?'credential_id':'user_id',job.identity_id).eq('campaign_id',job.campaign_id).maybeSingle();if(ge)throw ge
  if(!grant){await db.from('collection_assignment_emails').update({cancelled_at:new Date().toISOString(),lease_until:null}).eq('id',job.id);continue}
  const {data:campaign,error:ce}=await db.from('campaigns').select('name,organizations(name,logo_url)').eq('id',job.campaign_id).single();if(ce)throw ce
  const org:any=Array.isArray(campaign.organizations)?campaign.organizations[0]:campaign.organizations
  const message=renderEmail(defaultEmailDesign('access_approved'),{organization:org.name,logo:org.logo_url||'',name:'',title:'You have access to '+campaign.name,body:'You have been assigned access to '+campaign.name+' in Fundraiser Command. Sign in with your existing account or PIN. If you have multiple assigned collections, use My collections to switch between them.',href:'/login',settingsHref:'/portal'})
  await transport.sendMail({...emailSender(),to:job.recipient,...message,subject:'Collection access: '+campaign.name,messageId:`<collection-access-${job.id}@fundraisercommand.com>`})
  const {error:se}=await db.from('collection_assignment_emails').update({sent_at:new Date().toISOString(),lease_until:null,last_error:null}).eq('id',job.id);if(se)throw se;sent++
 }catch{failed++;await db.from('collection_assignment_emails').update({last_error:'Delivery failed. Automatic retry pending.',lease_until:new Date(Date.now()+300000).toISOString()}).eq('id',job.id)}}}finally{transport.close()}
 return {sent,failed}
}
