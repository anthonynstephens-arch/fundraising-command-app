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


const Chart=load('components/designer/DesignerAnalytics.tsx').default
const root=createRoot(document.getElementById('app'))
;(async()=>{
 await act(()=>root.render(React.createElement(Chart,{daily:[{date:'2026-10-06',sales:50,commission:4,units:2}],products:[{title:'Test shirt',qty:2,sales:50,earned:4}],today:'2026-10-06',balance:{available:4,pending:0,paid:0}})))
 assert.match(document.body.textContent,/\$50/)
 await act(()=>[...document.querySelectorAll('button')].find(x=>x.textContent==='Commission').click())
 assert.match(document.querySelector('svg').getAttribute('aria-label'),/Total \$4/)
 await act(()=>[...document.querySelectorAll('button')].find(x=>x.textContent==='7 days').click())
 assert.equal(document.querySelectorAll('tbody tr').length,7)
 assert.match(document.body.textContent,/Test shirt/)
 await act(()=>root.unmount())
 console.log('PASS: chart metric switch, date filtering, accessible daily values and rankings.')
})().catch(e=>{console.error(e);process.exitCode=1})
