import {NextResponse} from 'next/server'
import {createECDH} from 'node:crypto'
import {notificationIdentity} from '@/lib/portal/notification-identity'
import {validPushSubscription} from '@/lib/portal/push-validation'
export const dynamic='force-dynamic'
async function config(db:any){
 let {data,error}=await db.from('portal_push_config').select('*').eq('id',true).single();if(error)throw error
 if(!data.public_key){const key=createECDH('prime256v1');key.generateKeys();const r=await db.from('portal_push_config').update({public_key:key.getPublicKey().toString('base64url'),private_key:key.getPrivateKey().toString('base64url')}).eq('id',true).is('public_key',null);if(r.error)throw r.error;const fresh=await db.from('portal_push_config').select('*').eq('id',true).single();if(fresh.error)throw fresh.error;data=fresh.data}
 return data
}
export async function GET(req:Request){try{
 const identity=await notificationIdentity(new URL(req.url).searchParams.get('organizationId')||'')
 if(!identity)return NextResponse.json({error:'Unauthorized'},{status:401})
 return NextResponse.json({publicKey:(await config(identity.db)).public_key},{headers:{'Cache-Control':'no-store'}})
}catch{return NextResponse.json({error:'Device setup is temporarily unavailable.'},{status:503})}}
export async function POST(req:Request){try{
 const raw=await req.text();if(raw.length>8192)return NextResponse.json({error:'Invalid subscription.'},{status:400})
 const body=JSON.parse(raw),org=String(body.organizationId||'')
 const identity=await notificationIdentity(org);if(!identity)return NextResponse.json({error:'Unauthorized'},{status:401})
 if(!validPushSubscription(body.subscription))return NextResponse.json({error:'Unsupported notification subscription.'},{status:400})
 const {db,identityType,identityId}=identity
 const filter={organization_id:org,identity_type:identityType,identity_id:identityId,endpoint:body.subscription.endpoint}
 if(body.action==='status'){const r=await db.from('portal_push_subscriptions').select('id').match(filter).maybeSingle();if(r.error)throw r.error;return NextResponse.json({subscribed:!!r.data},{headers:{'Cache-Control':'no-store'}})}
 if(!['enable','disable','test'].includes(body.action))return NextResponse.json({error:'Invalid action.'},{status:400})
 if(body.action==='disable'){const r=await db.from('portal_push_subscriptions').delete().match(filter);if(r.error)throw r.error;return NextResponse.json({ok:true})}
 if(body.action==='test'){
 const {data:sub,error}=await db.from('portal_push_subscriptions').select('id').match(filter).maybeSingle();if(error||!sub)throw Error()
 const settings=await config(db)
 const r=await fetch('https://cuzxnryslupnrlasntxl.supabase.co/functions/v1/portal-push-dispatch',{method:'POST',headers:{'content-type':'application/json','x-dispatch-token':settings.dispatch_token},body:JSON.stringify({testSubscriptionId:sub.id}),signal:AbortSignal.timeout(15000)})
 if(!r.ok)throw Error();return NextResponse.json({ok:true})
 }
 await config(db)
 const r=await db.from('portal_push_subscriptions').upsert({...filter,subscription:body.subscription},{onConflict:'organization_id,identity_type,identity_id,endpoint'});if(r.error)throw r.error
 return NextResponse.json({ok:true})
}catch{return NextResponse.json({error:'Unable to update device notifications. Please try again.'},{status:400})}}
