const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const {stripTypeScriptTypes}=require('node:module')
const mod={}
const code=stripTypeScriptTypes(fs.readFileSync('lib/portal/push-validation.ts','utf8')).replace('export function','function')+'\nexports.valid=validPushSubscription'
vm.runInNewContext(code,{exports:mod,URL})
const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/example',keys:{p256dh:'B'.repeat(87),auth:'A'.repeat(22)}}
assert.equal(mod.valid(subscription),true)
for(const endpoint of ['https://localhost/push','https://127.0.0.1/push','http://fcm.googleapis.com/push','https://fcm.googleapis.com.evil.test/push','https://user:password@fcm.googleapis.com/push','https://fcm.googleapis.com:444/push'])assert.equal(mod.valid({...subscription,endpoint}),false,endpoint)
assert.equal(mod.valid({...subscription,keys:{auth:'bad',p256dh:'bad'}}),false)
const gateCode=stripTypeScriptTypes(fs.readFileSync('lib/portal/notification-identity.ts','utf8')).replace(/import \{([^}]+)\} from '([^']+)'/g,(_,names,path)=>'const {'+names+'}=require('+JSON.stringify(path)+')').replace('export async function','async function')+'\nexports.identity=notificationIdentity'
let user=null,pin=null,platform=false
const allowedOrg='11111111-1111-1111-1111-111111111111',otherOrg='22222222-2222-2222-2222-222222222222'
const auth={auth:{getUser:async()=>({data:{user}})}}
const db={from(table){const filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},maybeSingle:async()=>({data:table==='platform_admins'?(platform?{user_id:user.id}:null):filters.organization_id===allowedOrg?{id:'member'}:null})};return q}}
vm.runInNewContext(gateCode,{exports:mod,require(name){if(name.includes('supabase/server'))return {createClient:async()=>auth};if(name.includes('supabase/admin'))return {createAdminClient:()=>db};if(name.includes('pin-auth'))return {getPortalPinSession:async()=>pin};throw Error(name)}})
;(async()=>{
assert.equal(await mod.identity(allowedOrg),null)
pin={organizationId:allowedOrg,credentialId:'pin',role:'viewer'}
assert.equal((await mod.identity(allowedOrg)).identityType,'pin')
assert.equal(await mod.identity(otherOrg),null)
pin=null;user={id:'user'}
assert.equal((await mod.identity(allowedOrg)).identityType,'user')
assert.equal(await mod.identity(otherOrg),null)
platform=true;assert.equal((await mod.identity(otherOrg)).identityType,'user')
console.log('PASS: notification identity isolation and push endpoint validation.')
})().catch(e=>{console.error(e);process.exitCode=1})
