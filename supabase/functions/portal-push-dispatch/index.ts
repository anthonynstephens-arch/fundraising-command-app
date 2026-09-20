import {createClient} from "npm:@supabase/supabase-js@2.57.4";
import webpush from "npm:web-push@3.6.7";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
function allowed(endpoint:string){try{const u=new URL(endpoint);return u.protocol==="https:"&&!u.port&&!u.username&&!u.password&&(u.hostname==="fcm.googleapis.com"||u.hostname==="updates.push.services.mozilla.com"||u.hostname.endsWith(".push.services.mozilla.com")||u.hostname==="web.push.apple.com"||u.hostname.endsWith(".push.apple.com"))}catch{return false}}
async function authorized(s:any){
 if(s.identity_type==="pin"){const {data}=await db.from("portal_pin_credentials").select("id").eq("id",s.identity_id).eq("organization_id",s.organization_id).eq("active",true).maybeSingle();return !!data}
 const [{data:member},{data:admin}]=await Promise.all([
 db.from("organization_members").select("id").eq("organization_id",s.organization_id).eq("user_id",s.identity_id).maybeSingle(),
 db.from("platform_admins").select("user_id").eq("user_id",s.identity_id).eq("is_active",true).maybeSingle()]);
 return !!(member||admin)
}
async function send(s:any,event:any,config:any){
 if(!allowed(s.endpoint)||!await authorized(s)){await db.from("portal_push_subscriptions").delete().eq("id",s.id);return}
 await webpush.sendNotification(s.subscription,JSON.stringify({id:event.id,title:event.title,body:event.body,href:event.href}),{vapidDetails:{subject:"mailto:support@fundraisercommand.com",publicKey:config.public_key,privateKey:config.private_key},TTL:86400,timeout:10000});
}
Deno.serve(async req=>{
 try{
 const {data:config,error}=await db.from("portal_push_config").select("*").eq("id",true).single();
 const supplied=req.headers.get("x-dispatch-token")||"";
 if(error||!supplied||supplied.length!==config.dispatch_token.length||!crypto.subtle)return new Response("Unauthorized",{status:401});
 const digest=async(s:string)=>new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)));
 const a=await digest(supplied),b=await digest(config.dispatch_token);let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];
 if(difference)return new Response("Unauthorized",{status:401});
 const body=await req.json().catch(()=>({}));
 if(body.testSubscriptionId){
 const {data:s}=await db.from("portal_push_subscriptions").select("*").eq("id",body.testSubscriptionId).single();
 if(!s||!config.public_key)return new Response("Subscription not ready",{status:400});
 await send(s,{id:"device-test",title:"Notifications are ready",body:"Fundraiser Command can send updates to this device.",href:"/portal/notifications?org="+s.organization_id},config);
 return Response.json({ok:true})
 }
 const {data:events,error:eventsError}=await db.from("portal_notification_events").select("*").is("processed_at",null).lt("attempts",5).order("created_at").limit(25);
 if(eventsError)throw eventsError;
 let processed=0;
 for(const event of events||[]){
 const now=new Date().toISOString();
 const {data:claimed}=await db.from("portal_notification_events").update({lease_until:new Date(Date.now()+120000).toISOString(),attempts:event.attempts+1}).eq("id",event.id).is("processed_at",null).or("lease_until.is.null,lease_until.lt."+now).select("id");
 if(!claimed?.length)continue;
 let failed=false;
 const {data:subs,error:subError}=await db.from("portal_push_subscriptions").select("*").eq("organization_id",event.organization_id).lte("created_at",event.created_at);
 if(subError)continue;
 for(const sub of subs||[]){
 const {data:pref,error:prefError}=await db.from("portal_notification_preferences").select("*").eq("organization_id",sub.organization_id).eq("identity_type",sub.identity_type).eq("identity_id",sub.identity_id).maybeSingle();
 if(prefError){failed=true;continue}
 if(!pref?.browser_enabled||pref[event.category]===false)continue;
 const {data:sent}=await db.from("portal_push_deliveries").select("event_id").eq("event_id",event.id).eq("subscription_id",sub.id).maybeSingle();
 if(sent)continue;
 try{
 if(!config.public_key){failed=true;continue}
 await send(sub,event,config);
 await db.from("portal_push_deliveries").upsert({event_id:event.id,subscription_id:sub.id},{onConflict:"event_id,subscription_id"});
 }catch(error:any){
 if(error.statusCode===404||error.statusCode===410)await db.from("portal_push_subscriptions").delete().eq("id",sub.id);
 else failed=true;
 }
 }
 if(!failed){await db.from("portal_notification_events").update({processed_at:new Date().toISOString(),lease_until:null}).eq("id",event.id);processed++}
 else await db.from("portal_notification_events").update({lease_until:null}).eq("id",event.id)
 }
 return Response.json({ok:true,processed});
 }catch(error){console.error("Notification dispatch failed");return new Response("Notification dispatch failed",{status:500})}
});

