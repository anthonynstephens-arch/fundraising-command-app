import nodemailer from 'nodemailer'
import { createAdminClient } from '@/lib/supabase/admin'
export async function deliverAccessEmails(credentialId?:string) {
 const db=createAdminClient()
 const {data:jobs,error}=await db.rpc('claim_portal_access_emails',{input_credential:credentialId||null})
 if(error)throw error
 const port=Number(process.env.SMTP_PORT||465)
 const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port,secure:process.env.SMTP_SECURE==='true'||port===465,requireTLS:port!==465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD},connectionTimeout:10000,socketTimeout:15000})
 let sent=0,failed=0
 for(const job of jobs||[]){
  try{
   if(!process.env.SMTP_HOST||!process.env.SMTP_USER||!process.env.SMTP_PASSWORD)throw new Error('Email service is not configured')
   await transport.sendMail({from:{name:process.env.NOTIFICATION_FROM_NAME||'Fundraiser Command',address:process.env.NOTIFICATION_FROM_EMAIL||process.env.SMTP_USER!},replyTo:process.env.NOTIFICATION_REPLY_TO,to:job.recipient,subject:job.subject,text:job.body,messageId:`<access-${job.id}@fundraisercommand.com>`})
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
