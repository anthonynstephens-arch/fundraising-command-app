const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),swc=require('next/dist/build/swc')
function load(file,mocks={}){const exports={};const code=swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}}).code;vm.runInNewContext(code,{exports,require:n=>mocks[n]||require(n),Set,Map,URL,process});return exports}
const {pinCollectionContext:context}=load('lib/portal/pin-collection-context.ts')
const grants=[{id:'a',organization_id:'other'},{id:'b',organization_id:'other'},{id:'c',organization_id:'third'}]
assert.equal(context('home','owner',undefined,grants).organizationId,'other')
assert.equal(context('home','owner','forged',grants).role,'viewer')
assert.deepEqual(Array.from(context('home','owner',undefined,[]).campaignIds),[])
assert.deepEqual(Array.from(context('home','owner',undefined,[...grants,{id:'home-grant',organization_id:'home'}]).campaignIds),['home-grant'])
const selected=context('home','owner','a',grants)
assert.equal(selected.organizationId,'other');assert.equal(selected.role,'viewer');assert.equal(selected.delegated,true)
assert.deepEqual(Array.from(selected.campaignIds),['a','b'])
assert.equal(context('home','owner','a',[]).organizationId,'home','revoked grant must stop access')
let writes=0
const route=load('app/api/admin/pin-collections/route.ts',{'@/app/api/admin/users/route':{POST:async()=>{throw Error('Unauthorized delegate')}},'next/server':{NextResponse:{json:(body,{status=200}={})=>({body,status})}},'@/lib/admin/require-platform-admin':{requirePlatformAdmin:async()=>({ok:false,status:403})},'@/lib/supabase/admin':{createAdminClient:()=>{writes++;throw Error('Unexpected database access')}}})
;(async()=>{assert.equal((await route.GET({url:'https://example.test?credentialId=x'})).status,403);assert.equal((await route.POST({json:async()=>({credentialId:'x',campaignId:'a',assigned:true})})).status,403);assert.equal(writes,0);console.log('PASS multi-collection grants: isolated collections, viewer-only delegated role, forged/revoked selection, admin-only assignment.')})().catch(e=>{console.error(e);process.exitCode=1})
