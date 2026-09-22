const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module')
const mod={}
vm.runInNewContext(stripTypeScriptTypes(fs.readFileSync('lib/portal/payout-profile.ts','utf8')).replace(/export function/g,'function')+'\nexports.prepare=preparePayoutDetails;exports.mask=maskPayoutDetails',{exports:mod})
const blank=Object.fromEntries(['bankName','accountName','accountType','routingNumber','accountNumber','paypalEmail','checkPayee','address1','address2','city','state','postalCode','country','legalName','ein','exemptionDate','nonprofitAddress','taxContactName','taxContactEmail'].map(k=>[k,'']))
const ach={...blank,method:'ach',bankName:'Test bank',accountName:'Agency',accountType:'checking',routingNumber:'021000021',accountNumber:'000012345678',is501c3:false}
const saved=mod.prepare(ach);assert.equal(saved.accountNumber,'000012345678')
assert.equal(mod.mask(saved).accountNumber,'');assert.equal(mod.mask(saved).accountNumberLast4,'5678');assert.equal(mod.mask(saved).routingNumber,'')
assert.equal(mod.prepare({...ach,accountNumber:'',routingNumber:''},saved).accountNumber,'000012345678')
assert.throws(()=>mod.prepare({...ach,routingNumber:'021000022'}),/routing/)
assert.throws(()=>mod.prepare({...ach,accountNumber:'abc'}),/account number/)
assert.throws(()=>mod.prepare({...ach,method:'paypal',paypalEmail:'bad'}),/PayPal/)
assert.throws(()=>mod.prepare({...ach,is501c3:true,ein:'123'}),/nonprofit/)
const charity=mod.prepare({...ach,is501c3:true,ein:'12-3456789',legalName:'Test foundation',nonprofitAddress:'Test address'})
assert.equal(charity.ein,'123456789');assert.equal(mod.mask(charity).ein,'');assert.equal(mod.mask(charity).einLast4,'6789')
assert.equal(mod.prepare({...ach,is501c3:false},charity).ein,'')
const gate={};let user=null,pin=null,platform=false,memberRole='viewer';const org='11111111-1111-1111-1111-111111111111',other='22222222-2222-2222-2222-222222222222'
const auth={auth:{getUser:async()=>({data:{user}})}}
const db={from(table){const filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},then(resolve){resolve({data:user?[{organization_id:org,role:memberRole}]:[]})},maybeSingle:async()=>({data:table==='platform_admins'?(platform?{user_id:'admin'}:null):{id:filters.id,is_active:true,organization_type:'fire_department'}})};return q}}
const context={};vm.runInNewContext(stripTypeScriptTypes(fs.readFileSync('lib/portal/context.ts','utf8')).replace(/export function/g,'function')+'\nexports.resolvePortalContext=resolvePortalContext',{exports:context})
const code=stripTypeScriptTypes(fs.readFileSync('lib/portal/organization-access.ts','utf8')).replace(/import \{([^}]+)\} from '([^']+)'/g,(_,names,path)=>'const {'+names+'}=require('+JSON.stringify(path)+')').replace('export async function','async function')+'\nexports.access=organizationAccess'
vm.runInNewContext(code,{exports:gate,require(name){if(name.includes('supabase/server'))return {createClient:async()=>auth};if(name.includes('supabase/admin'))return {createAdminClient:()=>db};if(name.includes('pin-auth'))return {getPortalPinSession:async()=>pin};if(name.includes('context'))return context;throw Error(name)}})
;(async()=>{
 assert.equal(await gate.access(org),null)
 pin={organizationId:org,credentialId:'test-pin',role:'viewer'}
 assert.equal((await gate.access(org)).canFinance,false);assert.equal((await gate.access(org)).canManage,false);assert.equal(await gate.access(other),null)
 pin.role='manager';assert.equal((await gate.access(org)).canManage,true);assert.equal((await gate.access(org)).canFinance,false)
 pin.role='admin';assert.equal((await gate.access(org)).canFinance,true)
 pin=null;user={id:'test-user'};memberRole='owner';assert.equal((await gate.access(org)).canFinance,true);assert.equal(await gate.access(other),null)
 platform=true;assert.equal((await gate.access(other)).platform,true)
 console.log('PASS: payment validation, leading zeros, masked secrets, nonprofit changes, role gates, and cross-department denial.')
})().catch(e=>{console.error(e);process.exitCode=1})
