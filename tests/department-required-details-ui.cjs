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
Object.assign(global,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,sessionStorage:dom.window.sessionStorage,HTMLElement:dom.window.HTMLElement,Event:dom.window.Event,CustomEvent:dom.window.CustomEvent,IS_REACT_ACT_ENVIRONMENT:true})
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


const Review=load('components/admin/DepartmentDetailsReview.tsx').default
const Status=load('components/portal/DepartmentDetailsStatus.tsx').default
const Contacts=load('components/portal/AgencyContacts.tsx').default
let fixture={org:{require_details:true,is_union:true,details_status:'incomplete',details_version:2},missing:['Union president contact'],canSubmit:true}
let submitted=[]
global.fetch=async (url,options)=>{
 if(options?.method==='POST'){const body=JSON.parse(options.body);submitted.push(body);fixture={...fixture,org:{...fixture.org,details_status:body.status||'pending'}};return {ok:true,json:async()=>({ok:true})}}
 if(String(url).includes('/contacts'))return {ok:true,json:async()=>({org:{organization_type:'fire',require_details:true,is_union:true},contacts:[],canManage:true,canSetUnion:false})}
 return {ok:true,json:async()=>structuredClone(fixture)}
}
let root=createRoot(document.getElementById('app'))
const button=text=>[...document.querySelectorAll('button')].find(el=>el.textContent===text)
async function render(component){await act(async()=>{root.render(React.createElement(component,{organizationId:'test-org'}));await Promise.resolve()})}
;(async()=>{
 await render(Review)
 assert.equal(document.querySelector('input[type=checkbox]').checked,true)
 assert.equal(button('Accept department details').disabled,true)
 assert.match(document.body.textContent,/Union president contact/)
 fixture={...fixture,org:{...fixture.org,details_status:'pending'},missing:[]}
 await act(()=>button('Refresh review').click())
 assert.equal(button('Accept department details').disabled,false)
 await act(()=>button('Accept department details').click())
 assert.equal(submitted[0].status,'approved');assert.equal(submitted[0].version,2)
 assert.match(document.body.textContent,/accepted|Accepted/)
 await act(()=>root.unmount());root=createRoot(document.getElementById('app'))
 fixture={...fixture,org:{...fixture.org,details_status:'incomplete',details_version:3}}
 await render(Status)
 fixture.org.details_version=4
 await act(()=>button('Submit department details for approval').click())
 assert.equal(submitted[1].version,4,'Submission uses the latest saved version')
 assert.equal(button('Submitted for review').disabled,true)
 assert.doesNotMatch(document.body.textContent,/Open department portal/)
 await act(()=>root.unmount());root=createRoot(document.getElementById('app'))
 await render(Contacts)
 assert.equal(document.querySelector('select').disabled,true,'Department cannot change administrator union flag')
 assert.match(document.body.textContent,/Union president/)
 await act(()=>root.unmount())
 console.log('PASS: required-details controls, completeness gate, admin acceptance, current submission version, awaiting-review lock, and admin-controlled union status.')
})().catch(e=>{console.error(e);process.exitCode=1})
