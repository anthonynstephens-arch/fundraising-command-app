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
  if(name==='next/navigation')return {usePathname:()=>currentPath,useRouter:()=>router}
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



let currentPath='/portal',redirects=[]
const router={replace:href=>redirects.push(href)}
let poll
window.setInterval=fn=>{poll=fn;return 1}
window.clearInterval=()=>{}
const Gate=load('components/portal/DepartmentPortalGate.tsx').default
let locked=false,fail=false
let release
const firstResponse=new Promise(resolve=>{release=resolve})
let first=true
const requests=[]
global.fetch=async (url,options)=>{requests.push({url,options});if(first){first=false;await firstResponse}return {ok:!fail,json:async()=>({locked})}}
const root=createRoot(document.getElementById('app'))
async function render(){await act(async()=>{root.render(React.createElement(Gate,{organizationId:'fixture'},React.createElement('div',{'data-sales':true},'SALES DATA AND NAVIGATION')));await Promise.resolve()})}
;(async()=>{
 await render()
 assert.equal(document.querySelector('[data-sales]'),null,'No sales or tabs before access is checked')
 await act(async()=>{release();await firstResponse})
 assert.ok(document.querySelector('[data-sales]'))
 assert.match(requests[0].url,/accessOnly=1/);assert.equal(requests[0].options.cache,'no-store')
 locked=true
 await act(async()=>{await poll()})
 assert.equal(document.querySelector('[data-sales]'),null,'Existing tab is locked when requirement changes')
 assert.match(document.body.textContent,/Department details required/)
 assert.equal(redirects.at(-1),'/department-details?org=fixture')
 locked=false
 await act(async()=>{window.dispatchEvent(new window.Event('focus'));await Promise.resolve()})
 assert.ok(document.querySelector('[data-sales]'),'Focus rechecks department access')
 fail=true
 await act(async()=>{await poll()})
 assert.equal(document.querySelector('[data-sales]'),null,'Failed access check does not display cached sales')
 fail=false
 await act(async()=>{document.querySelector('button').click();await Promise.resolve()})
 assert.ok(document.querySelector('[data-sales]'))
 await act(()=>root.unmount())
 console.log('PASS: hides tabs before access checks, locks existing sessions, prompts and redirects, rechecks focus, and hides cached data on failed checks.')
})().catch(e=>{console.error(e);process.exitCode=1})
