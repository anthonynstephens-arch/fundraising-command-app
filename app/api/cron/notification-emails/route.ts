import {NextResponse} from 'next/server'
import {timingSafeEqual} from 'node:crypto'
import {deliverNotificationEmails} from '@/lib/portal/notification-email'
import {createAdminClient} from '@/lib/supabase/admin'
import {emailTransport} from '@/lib/portal/email-transport'
export const maxDuration=60
export async function GET(request:Request){
 if(!process.env.CRON_SECRET||request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:'Unauthorized'},{status:401})
 try{return NextResponse.json(await deliverNotificationEmails())}catch{return NextResponse.json({error:'Email dispatch failed.'},{status:503})}
}
// Database scheduler uses the same protected dispatch credential as device alerts.
export async function POST(request:Request){
 const supplied=request.headers.get('x-dispatch-token')||''
 if(!supplied)return NextResponse.json({error:'Unauthorized'},{status:401})
 const {data:config}=await createAdminClient().from('portal_push_config').select('dispatch_token').eq('id',true).single()
 const expected=config?.dispatch_token||''
 if(!expected||Buffer.byteLength(supplied)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return NextResponse.json({error:'Unauthorized'},{status:401})
 try{
  const body=await request.json().catch(()=>({}))
  if(body.checkConnection===true){const transport=emailTransport();try{await transport.verify();return NextResponse.json({ok:true,connected:true})}finally{transport.close()}}
  return NextResponse.json(await deliverNotificationEmails())
 }catch{return NextResponse.json({error:'Email dispatch failed.'},{status:503})}
}
