import {createAdminClient} from '@/lib/supabase/admin'
import {emailTransport,emailSender} from './email-transport'
import {renderEmail,defaultEmailDesign} from './email-template'
const titles:Record<string,string>={signup:'Confirm your email address',invite:'Your Fundraiser Command invitation',magiclink:'Your sign-in link',email:'Confirm your email address',recovery:'Reset your password',email_change:'Confirm your email change',reauthentication:'Your verification code',password_changed_notification:'Your password was changed',email_changed_notification:'Your email address was changed',phone_changed_notification:'Your phone number was changed',identity_linked_notification:'A sign-in method was added',identity_unlinked_notification:'A sign-in method was removed',mfa_factor_enrolled_notification:'An authentication factor was added',mfa_factor_unenrolled_notification:'An authentication factor was removed'}
export function authEmailMessage(job:{action:string;token_hash?:string|null;token?:string|null}){
 const title=titles[job.action];if(!title)throw Error('Unsupported authentication email action.')
 const security=job.action.endsWith('_notification')
 const href=job.token_hash?'/auth/confirm-email?type='+encodeURIComponent(job.action)+'&token_hash='+encodeURIComponent(job.token_hash):'/login'
 const body=security?'This security change was made to your Fundraiser Command account. If you did not make this change, contact anthony@detroitdecalandapparel.com immediately.':job.action==='reauthentication'?'Your verification code is '+job.token+'. Enter it in the screen that requested verification.':'Use the button below to complete your request. If you did not request this, you can ignore this email.'
 return renderEmail({...defaultEmailDesign('access_approved'),intro:'An update for your Fundraiser Command account.',button:security?'Sign in':job.action==='reauthentication'?'Open Fundraiser Command':'Continue securely'},{organization:'Fundraiser Command',name:'',title,body,href})
}
export async function deliverAuthEmails(){
 const db=createAdminClient(),transport=emailTransport(),started=Date.now();let sent=0,failed=0
 try{
  // Remove expired authentication material instead of retaining login tokens.
  await db.from('auth_email_queue').delete().lt('created_at',new Date(Date.now()-86400000).toISOString())
  while(Date.now()-started<40000){
   const {data:jobs,error}=await db.rpc('claim_auth_email');if(error)throw error
   const job=jobs?.[0];if(!job)break
   try{
    if((job.token_hash||job.token)&&Date.now()-new Date(job.created_at).getTime()>50*60000)throw Error('expired')
    await transport.sendMail({...emailSender(),to:job.recipient,...authEmailMessage(job),messageId:`<auth-${job.id}@fundraisercommand.com>`})
    const {error:se}=await db.from('auth_email_queue').update({sent_at:new Date().toISOString(),token:null,token_hash:null,lease_until:null,last_error:null}).eq('id',job.id);if(se)throw se;sent++
   }catch(e){failed++;const expired=e instanceof Error&&e.message==='expired';await db.from('auth_email_queue').update({last_error:expired?'Expired; request a new email.':'Delivery failed.',...(expired||job.attempts>=5?{attempts:5,token:null,token_hash:null}:{}),lease_until:new Date(Date.now()+60000).toISOString()}).eq('id',job.id)}
  }
 }finally{transport.close()}
 return {sent,failed}
}
