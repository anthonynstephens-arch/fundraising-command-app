const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),swc=require('next/dist/build/swc')
function load(file,mocks){const exports={};vm.runInNewContext(swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}}).code,{exports,require:n=>mocks[n]||require(n)});return exports}
let gate={ok:false},user=null,pin=null,rows=[]
const owner=load('lib/activity/owner.ts',{'@/lib/admin/require-platform-admin':{requirePlatformAdmin:async()=>gate}})
const route=load('app/api/activity/route.ts',{'next/server':{NextResponse:class{constructor(_,o){this.status=o.status}}},'@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user}})}})},'@/lib/pin-auth':{getPortalPinSession:async()=>pin},'@/lib/supabase/admin':{createAdminClient:()=>({from:()=>({insert:async r=>{rows.push(r);return {error:null}}})})}})
const request=(body,origin='https://portal.test')=>({headers:{get:k=>k==='origin'?origin:null},nextUrl:{origin:'https://portal.test'},json:async()=>body})
;(async()=>{
 assert.equal(await owner.canReadActivity(),false)
 gate={ok:true,user:{id:'other-admin'}};assert.equal(await owner.canReadActivity(),false)
 gate={ok:true,user:{id:owner.ACTIVITY_OWNER_ID}};assert.equal(await owner.canReadActivity(),true)
 const body={kind:'download',path:'/portal/reports?token=secret',detail:'report.pdf',actor_id:'forged'}
 assert.equal((await route.POST(request(body))).status,401)
 user={id:'verified',email:'user@example.test'}
 assert.equal((await route.POST(request(body,'https://evil.test'))).status,403)
 assert.equal(rows.length,0)
 assert.equal((await route.POST(request(body))).status,204)
 assert.equal(rows[0].actor_id,'verified');assert.equal(rows[0].path,'/portal/reports')
 user=null;pin={credentialId:'123',displayName:'Department PIN',organizationId:'org'}
 assert.equal((await route.POST(request(body))).status,204);assert.equal(rows[1].actor_id,'pin:123')
 assert.equal((await route.POST(request({...body,kind:'invented'}))).status,400)
 console.log('PASS activity: owner-only access, other-admin denial, account/PIN attribution, cross-origin rejection, query stripping, event validation')
})().catch(e=>{console.error(e);process.exitCode=1})
