import {NextResponse} from 'next/server'
import {notificationIdentity} from '@/lib/portal/notification-identity'
export const dynamic='force-dynamic'
export async function GET(req:Request){
 const org=new URL(req.url).searchParams.get('organizationId')||''
 const identity=await notificationIdentity(org)
 if(!identity)return NextResponse.json({error:'Unauthorized'},{status:401})
 const {db,identityType,identityId}=identity
 const [{data:events,error},{data:pref,error:prefError}]=await Promise.all([
 db.from('portal_notification_events').select('id,category,title,body,href,created_at').eq('organization_id',org).order('created_at',{ascending:false}).limit(50),
 db.from('portal_notification_preferences').select('*').eq('organization_id',org).eq('identity_type',identityType).eq('identity_id',identityId).maybeSingle()])
 if(error||prefError)return NextResponse.json({error:'Unable to load notifications.'},{status:503})
 const visible=pref?.in_app_enabled===false?[]:(events||[]).filter((e:any)=>pref?.[e.category]!==false)
 return NextResponse.json({events:visible,unread:visible.filter((e:any)=>!pref?.notifications_read_at||e.created_at>pref.notifications_read_at).length},{headers:{'Cache-Control':'no-store'}})
}
