const assert=require('node:assert/strict')
const fs=require('node:fs'),vm=require('node:vm')
const swc=require('next/dist/build/swc')
function load(file,mocks={}){
 const exports={}
 const code=swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}}).code
 vm.runInNewContext(code,{exports,Intl,Date,require:n=>n in mocks?mocks[n]:require(n)})
 return exports
}
const period=load('lib/portal/reporting-period.ts')
assert.equal(period.reportingDay('2026-09-01T03:59:59Z'),'2026-08-31')
assert.equal(period.reportingDay('2026-09-01T04:00:00Z'),'2026-09-01')
assert.equal(period.reportingDay('2026-01-01T04:59:59Z'),'2025-12-31')
assert.equal(period.inReportingPeriod('2026-09-01T03:59:59Z','2026-09-01','2026-09-14'),false)
assert.equal(period.inReportingPeriod('2026-09-01T04:00:00Z','2026-09-01','2026-09-14'),true)
assert.equal(period.inReportingPeriod('2026-09-15T03:59:59Z',null,'2026-09-14'),true)
assert.equal(period.inReportingPeriod('2026-09-15T04:00:00Z',null,'2026-09-14'),false)
assert.equal(period.validReportingDate('2026-02-30'),false)
assert.equal(period.validReportingDate('2026-09-01'),true)
assert.equal(period.validReportingDate('2099-01-01'),false)
let writes=0,allow=false
const mocks={
 'next/server':{NextResponse:{json:(body,{status=200}={})=>({body,status})}},
 'next/cache':{revalidatePath(){}},
 '@/lib/admin/require-platform-admin':{requirePlatformAdmin:async()=>({ok:allow,status:403})},
 '@/lib/supabase/admin':{createAdminClient:()=>({from:()=>{writes++;throw new Error('Unexpected write')}})},
 '@/lib/portal/reporting-period':period,
 '@/lib/shopify/import-history':{importDepartmentHistory:async()=>{writes++;throw new Error('Unexpected import')}}
}
;(async()=>{
 for(const file of ['app/api/admin/department-reporting/route.ts','app/api/admin/department-history/route.ts']){
   const route=load(file,mocks)
   const denied=await route.POST({json:async()=>({organizationId:'test',startDate:'2026-09-01'})})
   assert.equal(denied.status,403)
 }
 assert.equal(writes,0)
 allow=true
 const route=load('app/api/admin/department-reporting/route.ts',mocks)
 const invalid=await route.POST({json:async()=>({organizationId:'test',startDate:'2026-02-30'})})
 assert.equal(invalid.status,400);assert.equal(writes,0)
 console.log('PASS: Detroit midnight and winter boundaries, inclusive reporting dates, invalid/future dates, and admin-only reporting/import endpoints.')
})().catch(error=>{console.error(error);process.exitCode=1})
