import {NextResponse} from 'next/server'
import {requirePlatformAdmin} from '@/lib/admin/require-platform-admin'
import {createAdminClient} from '@/lib/supabase/admin'
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}})
export async function GET(request:Request){
 const gate=await requirePlatformAdmin();if(!gate.ok)return reply({error:'Platform administrator required.'},gate.status)
 const db=createAdminClient(),params=new URL(request.url).searchParams
 try{
  if(params.has('identityId')){
   const kind=params.get('kind'),id=params.get('identityId')!,offset=Math.max(0,Number(params.get('offset')||0))
   if(!['pin','user'].includes(kind||'')||!Number.isInteger(offset))return reply({error:'Invalid history request.'},400)
   const {data,error}=await db.from(kind==='pin'?'portal_pin_login_events':'portal_user_sign_ins').select('id,logged_in_at').eq(kind==='pin'?'credential_id':'user_id',id).order('logged_in_at',{ascending:false}).range(offset,offset+50)
   if(error)throw error
   return reply({events:(data||[]).slice(0,50),hasMore:(data||[]).length>50})
  }
  const users:any[]=[];for(let page=1;;page++){const {data,error}=await db.auth.admin.listUsers({page,perPage:1000});if(error)throw error;users.push(...data.users);if(data.users.length<1000)break}
  const [pins,campaigns,pinGrants,userGrants,admins]=await Promise.all([
   db.from('portal_pin_credentials').select('id,display_name,email,active,role,organization_id,created_at'),
   db.from('campaigns').select('id,name,organization_id,organizations(name)').order('name'),
   db.from('portal_pin_campaign_access').select('credential_id,campaign_id'),
   db.from('portal_user_campaign_access').select('user_id,campaign_id'),
   db.from('platform_admins').select('user_id').eq('is_active',true)
  ]);for(const r of [pins,campaigns,pinGrants,userGrants,admins])if(r.error)throw r.error
  const counts=new Map<string,{count:number;last:string|null}>()
  for(const [table,column,kind] of [['portal_pin_login_events','credential_id','pin'],['portal_user_sign_ins','user_id','user']]){
   for(let from=0;;from+=1000){const {data,error}=await db.from(table).select(column+',logged_in_at').order('logged_in_at',{ascending:false}).range(from,from+999);if(error)throw error
    for(const e of (data||[]) as any[]){const key=kind+':'+e[column],s=counts.get(key)||{count:0,last:null};s.count++;s.last||=e.logged_in_at;counts.set(key,s)}if((data||[]).length<1000)break}
  }
  const rows=[...(pins.data||[]).map(p=>({id:p.id,kind:'pin',name:p.display_name,email:p.email||'',active:p.active,role:p.role,platform:false,assigned:(pinGrants.data||[]).filter(g=>g.credential_id===p.id).map(g=>g.campaign_id),...(counts.get('pin:'+p.id)||{count:0,last:null})})),...users.map(u=>({id:u.id,kind:'user',name:u.user_metadata?.full_name||u.email||'Email user',email:u.email||'',active:!u.banned_until||new Date(u.banned_until)<new Date(),role:'Email account',platform:(admins.data||[]).some(a=>a.user_id===u.id),assigned:(userGrants.data||[]).filter(g=>g.user_id===u.id).map(g=>g.campaign_id),count:counts.get('user:'+u.id)?.count||0,last:u.last_sign_in_at||counts.get('user:'+u.id)?.last||null}))]
  return reply({users:rows,campaigns:campaigns.data})
 }catch{return reply({error:'Unable to load users and access.'},500)}
}
export async function POST(request:Request){
 const gate=await requirePlatformAdmin();if(!gate.ok)return reply({error:'Platform administrator required.'},gate.status)
 try{
  const {kind,identityId,campaignId,assigned,email}=await request.json(),db=createAdminClient()
  if(!['pin','user'].includes(kind)||typeof identityId!=='string')return reply({error:'Invalid user.'},400)
  if(email!==undefined){if(kind!=='pin'||typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||email.length>254)return reply({error:'Enter a valid email address.'},400)
   const {error}=await db.rpc('set_pin_notification_email',{identity:identityId,email_address:email.trim().toLowerCase()});if(error)throw error;return reply({ok:true,message:'Email saved. Pending collection notices are queued for delivery.'})}
  if(typeof campaignId!=='string'||typeof assigned!=='boolean')return reply({error:'Invalid collection assignment.'},400)
  let recipient=''
  if(kind==='pin'){const {data,error}=await db.from('portal_pin_credentials').select('email').eq('id',identityId).single();if(error)throw error;recipient=data.email||''}
  else {const {data,error}=await db.auth.admin.getUserById(identityId);if(error||!data.user)throw error||Error();recipient=data.user.email||''}
  const {error}=await db.rpc('set_collection_assignment',{kind,identity:identityId,campaign:campaignId,assigned,recipient_email:recipient});if(error)throw error
  return reply({ok:true,assigned,campaignId,notificationPending:assigned&&!recipient,message:assigned?(recipient?'Access assigned. Notification email queued.':'Access assigned. Add a notification email to send their collection notice.'):'Collection access removed.'})
 }catch{return reply({error:'Unable to save access.'},400)}
}
