const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),swc=require('next/dist/build/swc')
function load(file,mocks={}){const exports={};const code=swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript'},target:'es2022'},module:{type:'commonjs'}}).code;vm.runInNewContext(code,{exports,require:n=>mocks[n]||require(n),URL,Date,process});return exports}
const template=load('lib/portal/email-template.ts')
const {authEmailMessage:message}=load('lib/portal/auth-email.ts',{'@/lib/supabase/admin':{},'./email-transport':{},'./email-template':template})
for(const action of ['signup','invite','magiclink','recovery','email_change','email']){const m=message({action,token_hash:'fixture+hash&value'});assert(m.text.includes('https://www.fundraisercommand.com/auth/confirm-email?type='+action+'&token_hash=fixture%2Bhash%26value')); assert(!m.html.includes('fixture+hash&value'))}
assert(message({action:'reauthentication',token:'123456'}).text.includes('123456'))
assert(message({action:'password_changed_notification'}).text.includes('contact anthony@detroitdecalandapparel.com'))
assert.throws(()=>message({action:'unknown'}))
console.log('PASS: authentication email types, safe confirmation URLs, OTP codes and security notices.')
