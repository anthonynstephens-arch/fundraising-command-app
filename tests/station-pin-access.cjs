const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const swc = require('next/dist/build/swc')
function load(file, mocks = {}) {
  const exports = {}
  const code = swc.transformSync(fs.readFileSync(file, 'utf8'), {filename:file,jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}}).code
  vm.runInNewContext(code,{exports,require:n=>mocks[n],console})
  return exports
}
const context = load('lib/portal/context.ts')
let user = null, pin = null, isAdmin = false, members = []
const stations = [
  {id:'engine42',organization_type:'detroit_fire_station',is_active:true},
  {id:'engine17',organization_type:'detroit_fire_station',is_active:true},
  {id:'inactive',organization_type:'detroit_fire_station',is_active:false},
  {id:'agency',organization_type:'agency',is_active:true},
]
const db = {from(table) {
  let rows = table === 'organizations' ? stations : table === 'organization_members' ? members : isAdmin ? [{user_id:'email',is_active:true}] : []
  const q = {select(){return q},eq(k,v){rows=rows.filter(r=>r[k]===v);return q},in(k,vs){rows=rows.filter(r=>vs.includes(r[k]));return q},order(){return q},maybeSingle(){return Promise.resolve({data:rows[0]||null,error:null})},then(resolve){return Promise.resolve({data:rows,error:null}).then(resolve)}}
  return q
}}
const {stationAccess} = load('lib/stations/data.ts', {
  'server-only':{}, '@/lib/portal/context':context,
  '@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user}})}})},
  '@/lib/supabase/admin':{createAdminClient:()=>db},
  '@/lib/pin-auth':{getPortalPinSession:async()=>pin},
  'next/navigation':{redirect:p=>{throw new Error('redirect:'+p)},notFound:()=>{throw new Error('notFound')}},
})
;(async()=>{
  await assert.rejects(()=>stationAccess('engine42'), /redirect:\/station\/login/)
  pin={organizationId:'engine42',credentialId:'credential',displayName:'Brian',role:'admin'}
  const access=await stationAccess('engine42')
  assert.equal(access.station.id,'engine42')
  assert.equal(access.user.email,'Brian')
  assert.equal(access.pinSession,pin)
  assert.equal(access.admin,false)
  assert.equal(access.canRequest,false) // Existing payout RPC requires an email identity.
  assert.deepEqual(Array.from((await stationAccess()).stations,s=>s.id),['engine42'])
  await assert.rejects(()=>stationAccess('engine17'), /notFound/)
  await assert.rejects(()=>stationAccess('inactive'), /notFound/)
  await assert.rejects(()=>stationAccess('agency'), /notFound/)
  user={id:'email',email:'owner@example.test'}
  members=[{user_id:'email',organization_id:'engine17',role:'owner'}]
  assert.equal((await stationAccess('engine17')).canRequest,true)
  assert.equal((await stationAccess('engine17')).pinSession,null)
  assert.equal((await stationAccess('engine42')).pinSession,pin)
  isAdmin=true
  assert.equal((await stationAccess('engine17')).admin,true)
  assert.equal((await stationAccess('engine17')).pinSession,null)
  user=null;pin=null;isAdmin=false
  await assert.rejects(()=>stationAccess(), /redirect:\/station\/login/)
  console.log('PASS: PIN station navigation, directory isolation, other/inactive/non-station denial, email roles, mixed sessions, platform access, missing/expired session redirect.')
})().catch(e=>{console.error(e);process.exitCode=1})
