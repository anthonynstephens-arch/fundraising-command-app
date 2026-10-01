const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),swc=require('next/dist/build/swc')
function load(file,mocks={}){const exports={};const code=swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}}).code;vm.runInNewContext(code,{exports,require:n=>mocks[n],console});return exports}
const context=load('lib/portal/context.ts')
let platform=false,user={id:'fixture-user'},pin=null,status='incomplete',required=true
const touched=[]
const db={from(table){touched.push(table);if(!['organizations','organization_members','platform_admins'].includes(table))throw Error('DATA_QUERY');const q={select(){return q},eq(){return q},order(){return q},maybeSingle:async()=>({data:table==='platform_admins'?(platform?{role:'owner'}:null):{id:'fixture',require_details:required,details_status:status},error:null}),then(resolve){resolve({data:table==='organization_members'?[{organization_id:'fixture',role:'owner'}]:[],error:null})}};return q}}
const data=load('lib/portal/data.ts',{
 '@/lib/orders/status':{},'./reporting-period':{},'./context':context,
 '@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user}})}})},
 '@/lib/supabase/admin':{createAdminClient:()=>db},'@/lib/pin-auth':{getPortalPinSession:async()=>pin},
 'next/navigation':{redirect:p=>{throw Error('redirect:'+p)},notFound:()=>{throw Error('notFound')}}
})
;(async()=>{
 for(const login of ['owner','platform','pin']){
  platform=login==='platform';user=login==='pin'?null:{id:'fixture-user'};pin=login==='pin'?{organizationId:'fixture',credentialId:'fixture',role:'admin'}:null
  for(const reviewStatus of ['incomplete','pending','changes_requested']){status=reviewStatus;touched.length=0;await assert.rejects(()=>data.getPortalData('fixture'),/redirect:\/department-details\?org=fixture/);assert.equal(touched.includes('orders'),false);assert.equal(touched.includes('campaigns'),false)}
 }
 status='approved';await assert.rejects(()=>data.getPortalData('fixture'),/DATA_QUERY/)
 required=false;status='incomplete';await assert.rejects(()=>data.getPortalData('fixture'),/DATA_QUERY/)
 console.log('PASS: owner, platform admin and PIN department views are redirected before sales queries until accepted; accepted and optional departments retain access.')
})().catch(e=>{console.error(e);process.exitCode=1})
