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


global.matchMedia=window.matchMedia
const Onboarding=load('components/designer/DesignerOnboarding.tsx').default
let version=2,saved=false
let calls=[]
global.fetch=async(url,options)=>{calls.push(String(url));if(options?.method==='POST'){saved=JSON.parse(options.body).designerOnboardingCompleted;version=3}return {ok:true,json:async()=>({preferences:{onboarding_version:version}})}}
const root=createRoot(document.getElementById('app'))
;(async()=>{
 await act(async()=>{root.render(React.createElement(Onboarding,{organizationId:'test-org'}));await Promise.resolve()})
 assert.ok(document.querySelector('[role="dialog"]'))
 assert.match(document.body.textContent,/Home Screen/)
 assert.match(document.body.textContent,/Enable on this device/)
 await act(async()=>{[...document.querySelectorAll('button')].find(x=>x.textContent==='Continue to notifications').click();await Promise.resolve()})
 assert.equal(saved,true);assert.equal(document.querySelector('[role="dialog"]'),null)
 await act(()=>root.unmount())
 const second=createRoot(document.getElementById('app'))
 await act(async()=>{second.render(React.createElement(Onboarding,{organizationId:'test-org'}));await Promise.resolve()})
 assert.equal(document.querySelector('[role="dialog"]'),null)
 await act(()=>second.unmount())
 console.log('PASS: existing users see install coaching, completion persists, completed users are not prompted again.')
})().catch(e=>{console.error(e);process.exitCode=1})
