// React component tests require the test runtime even when Vercel builds with NODE_ENV=production.
// This setting is isolated to this test process; the subsequent Next.js build stays in production mode.
process.env.NODE_ENV="test"
// Isolated DOM tests: these synthetic variants are test fixtures, never catalog data.
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const Module=require('node:module')
const babel=require('next/dist/compiled/babel/core')
const {JSDOM}=require('jsdom')
const dom=new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>',{url:'http://localhost/'})
Object.assign(global,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,sessionStorage:dom.window.sessionStorage,HTMLElement:dom.window.HTMLElement,CustomEvent:dom.window.CustomEvent,IS_REACT_ACT_ENVIRONMENT:true})
let scrollCalls=[]
window.scrollTo=options=>scrollCalls.push(options)
window.requestAnimationFrame=callback=>{callback();return 1}
window.cancelAnimationFrame=()=>{}
window.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}})
window.HTMLElement.prototype.scrollIntoView=function(){}
window.HTMLElement.prototype.getClientRects=function(){return [this.getBoundingClientRect()]}
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client')
const cache=new Map()
function load(file){
 file=path.resolve(file)
 if(cache.has(file))return cache.get(file).exports
 const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod)
 mod.require=function(name){
  if(name==='next/navigation')return {usePathname:()=>'/dashboard'}
  if(name==='next/link')return {default:({children,...props})=>React.createElement('a',props,children),__esModule:true}
  if(name==='next/image')return {default:({fill,priority,sizes,...props})=>React.createElement('img',props),__esModule:true}
  if(name.startsWith('@/')||name.startsWith('.')){
   const target=name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name)
   for(const suffix of ['.tsx','.ts'])if(fs.existsSync(target+suffix))return load(target+suffix)
  }
  return Module.prototype.require.call(this,name)
 }
 mod._compile(babel.transformSync(fs.readFileSync(file,'utf8'),{filename:file,envName:'test',presets:[require('next/babel')],babelrc:false,configFile:false}).code,file)
 return mod.exports
}


const EmailStudio=load('components/admin/EmailStudio.tsx').default
const CommandCenter=load('components/admin/CommandCenter.tsx').default
let calls=[]
const snapshot={updatedAt:new Date().toISOString(),agencies:[{id:'test-agency',name:'Test Fire Department',organization_type:'fire_department',is_active:true,review_status:'pending',profile_version:2,profile_updated_at:new Date().toISOString(),active_campaigns:1,sales:1000,raised:200,access_requests:1,payout_requests:1,requested_amount:100}],activity:[],applications:1,emailQueued:0,emailFailed:0,accessEmailIssues:0,syncIssues:0}
global.fetch=async(url,options)=>{if(options?.body){calls.push(JSON.parse(options.body));return {ok:true,json:async()=>({ok:true,message:'Done'})}};return {ok:true,json:async()=>String(url).includes('command-center')?snapshot:{templates:[],organizations:[],deliveries:[],configured:true,testEmail:'owner@example.invalid'}}}
function visual(name){if(!process.env.VISUAL_FIXTURES)return;const {renderToStaticMarkup}=require('react-dom/server');const Chrome=load('components/admin/DashboardChrome.tsx').default;const html=renderToStaticMarkup(React.createElement(Chrome,null,React.createElement('div',{dangerouslySetInnerHTML:{__html:document.getElementById('app').innerHTML}})));const css=['app/globals.css','app/light-overrides.css','app/dashboard/command-center.css','app/dashboard/email-studio/studio.css'].map(p=>fs.readFileSync(p,'utf8')).join('\n');fs.mkdirSync('/tmp/fc-email-visual',{recursive:true});fs.writeFileSync('/tmp/fc-email-visual/'+name+'.html','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body>'+html+'</body></html>')}
const root=createRoot(document.getElementById('app'))
const button=text=>[...document.querySelectorAll('button')].find(el=>el.textContent===text)
;(async()=>{
 await act(async()=>{root.render(React.createElement(EmailStudio));await Promise.resolve()})
 visual('email-studio');assert.match(document.body.textContent,/Email connected/)
 assert(document.querySelector('iframe').getAttribute('srcdoc').includes('Your community showed up.'))
 await act(()=>button('Celebration').click())
 assert(document.querySelector('iframe').getAttribute('srcdoc').includes('#be185d'))
 await act(async()=>{button('Save draft').click();await Promise.resolve()})
 assert.equal(calls[0].action,'save');assert.equal(calls[0].design.style,'celebration')
 await act(()=>button('Mobile').click());assert.equal(document.querySelector('iframe').style.width,'375px')
 await act(async()=>{root.render(React.createElement(CommandCenter));await Promise.resolve()})
 visual('command-center');assert.match(document.body.textContent,/Payment information/);assert.match(document.body.textContent,/Test Fire Department/)
 assert(document.querySelector('a[href="/dashboard/organizations/test-agency#payout-profile"]'))
 await act(()=>root.unmount());console.log('PASS: Email Studio presets, draft action, mobile preview and Command Center review links.')
})().catch(e=>{console.error(e);process.exitCode=1})
