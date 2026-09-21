const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const babel = require('next/dist/compiled/babel/core')
let state = {}, filters = []
const orgId='macac-test-org'
function load(file) {
 const mod = new Module(file,module)
 mod.filename=path.resolve(file)
 mod.paths=Module._nodeModulePaths(path.dirname(mod.filename))
 mod.require=function(name) {
  if(name==='next/navigation') return {redirect: url=>{throw new Error('redirect:'+url)},notFound:()=>{throw new Error('notFound')}}
  if(name==='@/lib/supabase/server') return {createClient:async()=>({auth:{getUser:async()=>({data:{user:state.user||null}})}})}
  if(name==='@/lib/pin-auth') return {getPortalPinSession:async options=>{assert.equal(options.allowPendingPinChange,true);return state.pin||null}}
  if(name==='@/lib/supabase/admin') return {createAdminClient:()=>({from:table=>{
   const q={select(){return q},eq(key,value){filters.push([table,key,value]);return q},maybeSingle(){return q},then(resolve){return Promise.resolve({data:table==='organizations'?{id:orgId}:table==='platform_admins'?state.platform||null:state.memberships||[]}).then(resolve)}}
   return q
  }})}
  if(name==='@/lib/portal/context')return load('lib/portal/context.ts')
  return Module.prototype.require.call(this,name)
 }
 mod._compile(babel.transformSync(fs.readFileSync(file,'utf8'),{filename:file,presets:[require('next/babel')],babelrc:false,configFile:false}).code,mod.filename)
 return mod.exports
}
const Page=load('app/stores/macac/portal/page.tsx').default
async function check(fixture,outcome){state=fixture;filters=[];await assert.rejects(Page(),{message:outcome})}
async function run(){
 await check({},'redirect:/stores/macac/login')
 await check({pin:{organizationId:'other',role:'owner',mustChangePin:false}},'notFound')
 await check({pin:{organizationId:orgId,role:'viewer',mustChangePin:true}},'redirect:/stores/macac/change-pin')
 await check({pin:{organizationId:orgId,role:'viewer',mustChangePin:false}},'redirect:/portal?org='+orgId)
 assert.ok(filters.some(([table,key,value])=>table==='organizations'&&key==='slug'&&value==='macac'))
 assert.ok(filters.some(([table,key,value])=>table==='organizations'&&key==='is_active'&&value===true))
 await check({user:{id:'test-user'},memberships:[{organization_id:'other',role:'owner'}]},'notFound')
 await check({user:{id:'test-user'},memberships:[{organization_id:orgId,role:'manager'}]},'redirect:/portal?org='+orgId)
 await check({user:{id:'test-admin'},platform:{user_id:'test-admin'}},'redirect:/portal?org='+orgId)
 console.log('PASS: MACAC login redirect, pending PIN change, tenant isolation, member access and platform-owner access.')
}
run().catch(error=>{console.error(error);process.exitCode=1})
