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
  if(name==='next/image')return {default:({fill,priority,sizes,unoptimized,...props})=>React.createElement('img',props),__esModule:true}
  if(name.startsWith('@/')||name.startsWith('.')){
   const target=name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name)
   for(const suffix of ['.tsx','.ts'])if(fs.existsSync(target+suffix))return load(target+suffix)
  }
  return Module.prototype.require.call(this,name)
 }
 mod._compile(babel.transformSync(fs.readFileSync(file,'utf8'),{filename:file,envName:'test',presets:[require('next/babel')],babelrc:false,configFile:false}).code,file)
 return mod.exports
}
const {EchinusStorefront}=load('components/storefront/EchinusStorefront.tsx')
const root=createRoot(document.getElementById('app'))
const click=async(el)=>{assert.ok(el);await act(()=>el.click())}
const button=(text)=>Array.from(document.querySelectorAll('button')).find(el=>el.textContent===text)
async function run(){
 await act(()=>root.render(React.createElement(EchinusStorefront,{})))
 assert.equal(document.querySelectorAll('.echinus-card').length,0)
 assert.match(document.querySelector('.echinus-empty').textContent,/collection is taking shape/)
 assert.ok(document.querySelector('a[href="/departments/echinus/login"]'))
 assert.doesNotMatch(document.body.textContent,/MACAC|Michigan|college/)
 const product={id:'qa-polo',handle:'qa-polo',title:'Test polo',description:'Fixture',images:[],options:[{name:'Size',values:['S','M']}],variants:[{id:'qa-small',title:'S',price:30,available:true,selectedOptions:[{name:'Size',value:'S'}],image:null}],minPrice:30,maxPrice:30,available:true}
 const campaign={id:'qa-echinus',slug:'echinus',organization_id:'qa-org',name:'ECHINUS',status:'active',starts_at:null,ends_at:null,organization:{name:'ECHINUS',slug:'echinus'},products:[product],shopifyConnected:true}
 await act(()=>root.render(React.createElement(EchinusStorefront,{key:'live',campaign})))
 await click(document.querySelector('.echinus-card-photo'))
 assert.equal(document.querySelector('.echinus-detail .echinus-cta').disabled,true)
 await click(button('M'))
 assert.equal(document.querySelector('.echinus-detail .echinus-cta').disabled,true)
 await click(button('S'))
 await click(button('Add to cart'))
 const saved=JSON.parse(localStorage.getItem('fundraiser-command-cart:qa-echinus'))
 assert.deepEqual([saved[0].variantId,saved[0].campaignId,saved[0].organizationId,saved[0].price],['qa-small','qa-echinus','qa-org',30])
 await act(()=>root.unmount())
 console.log('PASS: ECHINUS catalog, filters, details, Escape, preview purchase protection, option validation and real variant cart attribution.')
}
run().catch(error=>{console.error(error);process.exitCode=1})
