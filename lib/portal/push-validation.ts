export function validPushSubscription(value:any){
 try{
 const u=new URL(value?.endpoint),h=u.hostname
 const allowed=h==='fcm.googleapis.com'||h==='updates.push.services.mozilla.com'||h.endsWith('.push.services.mozilla.com')||h==='web.push.apple.com'||h.endsWith('.push.apple.com')
 return allowed&&u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&value.endpoint.length<2048&&typeof value.keys?.p256dh==='string'&&/^[A-Za-z0-9_-]{87}=?$/.test(value.keys.p256dh)&&typeof value.keys?.auth==='string'&&/^[A-Za-z0-9_-]{22}={0,2}$/.test(value.keys.auth)
 }catch{return false}
}
