const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),swc=require('next/dist/build/swc')
let binding=null,active=true,lookupError=null,verifyError=null,wrongUser=false,calls=[]
const db={from(table){const q={select(){return q},eq(){return q},maybeSingle:async()=>table==='platform_admin_pin_credentials'?{data:binding,error:lookupError}:{data:active?{user_id:'owner-id'}:null,error:null}};return q},auth:{admin:{getUserById:async id=>({data:{user:{id,email:'owner@example.test'}},error:null}),generateLink:async()=>{calls.push('generate');return {data:{user:{id:'owner-id'},properties:{hashed_token:'one-time-test-token'}},error:null}}}}}
const auth={auth:{signOut:async()=>{calls.push('signOut');return {error:null}},verifyOtp:async args=>{assert.equal(args.type,'email');calls.push('verify');return {data:{user:{id:wrongUser?'other':'owner-id'}},error:verifyError}}}}
const exportsObj={}
vm.runInNewContext(swc.transformSync(fs.readFileSync('lib/admin/pin-login.ts','utf8'),{filename:'lib/admin/pin-login.ts',jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}}).code,{exports:exportsObj,require:n=>({'server-only':{},'@/lib/supabase/admin':{createAdminClient:()=>db},'@/lib/supabase/server':{createClient:async()=>auth}}[n])})
;(async()=>{
 const login=exportsObj.establishPinIdentity
 assert.equal(await login('member'),false);assert.deepEqual(calls,['signOut'])
 binding={user_id:'owner-id'};calls=[]
 assert.equal(await login('owner'),true);assert.deepEqual(calls,['signOut','generate','verify'])
 active=false;calls=[];await assert.rejects(()=>login('owner'),/inactive/);assert.deepEqual(calls,['signOut'])
 active=true;lookupError=new Error('database unavailable');calls=[];await assert.rejects(()=>login('owner'),/database unavailable/);assert.deepEqual(calls,[])
 lookupError=null;wrongUser=true;calls=[];await assert.rejects(()=>login('owner'),/verify/);assert.equal(calls.at(-1),'signOut')
 const context=fs.readFileSync('lib/portal/context.ts','utf8');assert.ok(!context.includes('All Stations'))
 const commandLogin=fs.readFileSync('app/login/page.tsx','utf8')
 const stationLogin=fs.readFileSync('app/station/login/StationLogin.tsx','utf8')
 for(const source of [commandLogin,stationLogin])assert.ok(source.includes("data.redirectTo === '/dashboard'"))
 const commandPinSuccess=commandLogin.slice(commandLogin.indexOf('window.location.assign'),commandLogin.indexOf('async function submitEmail'))
 assert.ok(!commandPinSuccess.includes('router.refresh()'),'Fundraising Command must not refresh the login route after starting a PIN redirect')
 const stationPinSuccess=stationLogin.slice(stationLogin.indexOf('window.location.assign'),stationLogin.indexOf('} else {',stationLogin.indexOf('window.location.assign')))
 assert.ok(stationPinSuccess.includes('return'),'Firestation Command must stop after starting a PIN redirect')
 console.log('PASS: owner PIN establishes real identity; ordinary PIN clears stale owner session; inactive/missing bindings cannot escalate; mismatched identity signs out; both logins route owners to admin without racing a login-page refresh; All Stations removed.')
})().catch(e=>{console.error(e);process.exitCode=1})
