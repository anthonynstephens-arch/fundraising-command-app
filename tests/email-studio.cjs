const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module')
const template={};vm.runInNewContext(stripTypeScriptTypes(fs.readFileSync('lib/portal/email-template.ts','utf8')).replace(/export /g,'')+'\nObject.assign(exports,{defaultEmailDesign,validateEmailDesign,renderEmail})',{exports:template,URL})
const d=template.defaultEmailDesign('new_sales'),ctx={organization:'Fire & Rescue <script>',name:'Alex',title:'New sale',body:'<img onerror="alert(1)">',href:'https://evil.example/phish'}
const rendered=template.renderEmail(d,ctx)
assert.match(rendered.html,/Fire &amp; Rescue &lt;script&gt;/);assert(!rendered.html.includes('<img onerror'));assert(!rendered.html.includes('evil.example'));assert.match(rendered.text,/https:\/\/www.fundraisercommand.com\/portal/)
for(const value of [{...d,logo:'javascript:alert(1)'},{...d,accent:'red; color:white'},{...d,subject:'Header\nBcc: x'},{...d,headline:''}])assert.throws(()=>template.validateEmailDesign(value))
assert.equal(template.renderEmail({...d,intro:'Hello {{name}}'},ctx).text.includes('Hello Alex'),true)
const recipientModule={};let pinActive=true,enabled=true,categoryEnabled=true,agencyActive=true
const db={from(table){const filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},lte(){return q},single:async()=>({data:{id:'org',name:'Agency',is_active:agencyActive}}),then(resolve){let data=table==='organization_members'?[{user_id:'user'}]:table==='portal_pin_credentials'?(pinActive?[{id:'pin',email:'same@example.com',display_name:'PIN'}]:[]):[{identity_type:'pin',identity_id:'pin',email_enabled:enabled,new_sales:categoryEnabled}];return Promise.resolve({data}).then(resolve)}};return q},auth:{admin:{getUserById:async()=>({data:{user:{email:'same@example.com',email_confirmed_at:'2026-01-01',user_metadata:{}}}})}}}
let code=stripTypeScriptTypes(fs.readFileSync('lib/portal/notification-email.ts','utf8')).replace(/^import .*$/gm,'').replace(/export /g,'')+'\nexports.emailRecipients=emailRecipients'
vm.runInNewContext(code,{exports:recipientModule,console,Date,Map,Set})
;(async()=>{
 let r=await recipientModule.emailRecipients(db,'org','new_sales','2026-01-01');assert.equal(r.recipients.length,1,'deduplicate same email across PIN and user')
 enabled=false;r=await recipientModule.emailRecipients(db,'org','new_sales','2026-01-01');assert.equal(r.recipients.length,0,'opt-out wins for a duplicate address')
 enabled=true;categoryEnabled=false;r=await recipientModule.emailRecipients(db,'org','new_sales','2026-01-01');assert.equal(r.recipients.length,0,'category opt-out')
 categoryEnabled=true;agencyActive=false;r=await recipientModule.emailRecipients(db,'org','new_sales','2026-01-01');assert.equal(r.recipients.length,0,'inactive agency')
 console.log('PASS: template escaping, safe links, validation, recipient deduplication and opt-outs.')
})().catch(e=>{console.error(e);process.exitCode=1})
