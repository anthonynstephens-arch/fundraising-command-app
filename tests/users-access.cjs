const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),swc=require('next/dist/build/swc')
function load(file,mocks={}){const exports={};const code=swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}}).code;vm.runInNewContext(code,{exports,require:n=>mocks[n]||require(n),Set,Map,URL,process,Date});return exports}
let allowed=false,email='',calls=[]
const db={from(){const q={select(){return q},eq(){return q},single:async()=>({data:{email},error:null})};return q},rpc:async(name,args)=>{calls.push({name,args});return {data:true,error:null}}}
const route=load('app/api/admin/users/route.ts',{'next/server':{NextResponse:{json:(body,{status=200}={})=>({body,status})}},'@/lib/admin/require-platform-admin':{requirePlatformAdmin:async()=>({ok:allowed,status:403})},'@/lib/supabase/admin':{createAdminClient:()=>db}})
const transport=load('lib/portal/email-transport.ts',{nodemailer:{createTransport(){throw Error('No actual emails in tests')}}})
;(async()=>{
 const request=assigned=>({json:async()=>({kind:'pin',identityId:'pin',campaignId:'collection',assigned})})
 assert.equal((await route.GET({url:'https://example.test'})).status,403)
 assert.equal((await route.POST(request(true))).status,403);assert.equal(calls.length,0)
 allowed=true;const missingEmail=await route.POST(request(true));assert.equal(missingEmail.status,200);assert.equal(missingEmail.body.notificationPending,true);assert.equal(calls[0].args.recipient_email,'');calls=[]
 email='user@example.test';assert.equal((await route.POST(request(true))).status,200);assert.equal(calls[0].name,'set_collection_assignment');assert.equal(calls[0].args.recipient_email,email)
 assert.equal((await route.POST(request(false))).status,200);assert.equal(calls[1].args.assigned,false)
 assert.equal(transport.emailSender().bcc,'anthony@detroitdecalandapparel.com')
 const sends=[];const updates=[];let granted=true
 const mailDb={rpc:async()=>({data:[{id:'job',identity_type:'pin',identity_id:'pin',campaign_id:'collection',recipient:email}],error:null}),from(table){const q={select(){return q},eq(){return q},update(values){updates.push(values);return q},maybeSingle:async()=>({data:granted?{campaign_id:'collection'}:null,error:null}),single:async()=>({data:{name:'Northville',organizations:{name:'Northville Fire Explorers'}},error:null}),then(resolve){resolve({error:null})}};return q}}
 const mail=load('lib/portal/collection-assignment-email.ts',{'@/lib/supabase/admin':{createAdminClient:()=>mailDb},'./email-transport':{emailSender:transport.emailSender,emailTransport:()=>({sendMail:async m=>sends.push(m),close(){}})},'./email-template':{defaultEmailDesign:()=>({}),renderEmail:()=>({html:'Test',text:'Test'})}})
 assert.equal((await mail.deliverCollectionAssignmentEmails()).sent,1);assert.equal(sends[0].to,email);assert.equal(sends[0].bcc,'anthony@detroitdecalandapparel.com')
 granted=false;await mail.deliverCollectionAssignmentEmails();assert.equal(sends.length,1,'revoked access must cancel pending notice');assert(updates.some(u=>u.cancelled_at))
 console.log('PASS: administrator-only grants, pending-email assignments, assignment/revoke RPC, BCC, queued delivery, and revoked-notice cancellation.')
})().catch(e=>{console.error(e);process.exitCode=1})
