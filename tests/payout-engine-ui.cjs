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

const PayoutPreferences=load('components/portal/PayoutPreferences.tsx').default
const AgencyContacts=load('components/portal/AgencyContacts.tsx').default
let orgType='fire_department',union=true
const fixture={details:{method:'ach',is501c3:false,bankName:'Test bank',accountName:'Test agency',accountType:'checking',routingNumberLast4:'0021',accountNumberLast4:'5678'},version:1,canReveal:false}
global.fetch=async url=>({ok:true,json:async()=>String(url).includes('/contacts')?{contacts:[],org:{organization_type:orgType,is_union:union},canManage:true}:fixture})
const root=createRoot(document.getElementById('app'))
const button=text=>[...document.querySelectorAll('button')].find(el=>el.textContent===text)
async function render(component){await act(async()=>{root.render(React.createElement(component,{organizationId:'test-org'}));await Promise.resolve()})}
async function changeSelect(select,value){await act(()=>{select.value=value;select.dispatchEvent(new window.Event('change',{bubbles:true}))})}
;(async()=>{
 await render(PayoutPreferences)
 assert.match(document.body.textContent,/Saved ending in 5678/)
 assert.equal(document.querySelector('input[placeholder*="5678"]').value,'')
 assert.equal(button('View details for payout processing'),undefined)
 await act(()=>document.querySelector('input[value="paypal"]').click())
 assert.match(document.body.textContent,/PayPal email address/)
 await act(()=>document.querySelector('input[value="check"]').click())
 assert.match(document.body.textContent,/Mailing address/)
 await changeSelect([...document.querySelectorAll('select')].find(el=>el.querySelector('option[value="yes"]')),'yes')
 assert.match(document.body.textContent,/Tax ID \/ EIN/);assert.match(document.body.textContent,/Registered nonprofit address/)
 await render(AgencyContacts)
 assert.match(document.body.textContent,/Union president/);assert.match(document.body.textContent,/Union treasurer/)
 union=false;orgType='school';await act(()=>root.unmount())
 const root2=createRoot(document.getElementById('app'));await act(async()=>{root2.render(React.createElement(AgencyContacts,{organizationId:'school'}));await Promise.resolve()})
 assert.doesNotMatch(document.body.textContent,/Union officers/)
 assert.match(document.body.textContent,/Contact directory/)
 await act(()=>root2.unmount())
 console.log('PASS: ACH masking, payment method fields, conditional nonprofit fields, and fire-only union contacts.')
})().catch(e=>{console.error(e);process.exitCode=1})
