process.env.NODE_ENV='test'
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),swc=require('next/dist/build/swc'),{JSDOM}=require('jsdom')
const dom=new JSDOM('<div id="app"></div>',{url:'https://www.fundraisercommand.com/dashboard/users'})
Object.assign(global,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true})
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client')
let assignments=['home'],reject=false
async function fetchMock(url,options){if(options?.method==='POST'){if(reject)return {ok:false,json:async()=>({error:'Test save failed'})};const body=JSON.parse(options.body);assignments=body.assigned?[...assignments,body.campaignId]:assignments.filter(id=>id!==body.campaignId);return {ok:true,json:async()=>({message:'Access assigned. Add a notification email to send their collection notice.'})}}return {ok:true,json:async()=>url.includes('identityId')?{events:[],hasMore:false}:{users:[{id:'pin',kind:'pin',name:'Test PIN',email:'',active:true,role:'owner',platform:false,assigned:[...assignments],count:0,last:null}],campaigns:[{id:'home',name:'Previously assigned',organizations:{name:'Home'}},{id:'other',name:'New collection',organizations:{name:'Other'}}]}}}
const exportsObject={}
const file='components/admin/UsersAccess.tsx',code=swc.transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}}).code
vm.runInNewContext(code,{exports:exportsObject,require,fetch:fetchMock,Date,Set,Error})
const root=createRoot(document.getElementById('app'))
;(async()=>{
 await act(async()=>root.render(React.createElement(exportsObject.default)))
 await act(async()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Manage access').click())
 assert(document.body.textContent.includes('You can assign collections now'))
 let boxes=document.querySelectorAll('input[type=checkbox]');assert(boxes[0].checked);assert(!boxes[1].checked)
 await act(async()=>boxes[1].click())
 boxes=document.querySelectorAll('input[type=checkbox]');assert(boxes[0].checked);assert(boxes[1].checked,'new check persists after server refresh without email')
 assert(document.querySelector('[role=status]').closest('section').textContent.includes('Authorized collections'))
 reject=true;await act(async()=>boxes[1].click());assert(document.querySelectorAll('input[type=checkbox]')[1].checked,'failed removal preserves saved access');assert(document.querySelector('[role=alert]').textContent.includes('Test save failed'))
 await act(async()=>root.unmount());console.log('PASS: missing-email assignment stays checked after refresh; save status and errors remain beside collection controls.')
})().catch(e=>{console.error(e);process.exitCode=1})
