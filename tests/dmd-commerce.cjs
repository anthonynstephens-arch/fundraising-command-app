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
const {DmdStorefront}=load('components/storefront/DmdStorefront.tsx')
const im={url:'https://cdn.shopify.com/test.png',altText:'QA garment',width:800,height:800}
const product={id:'100',handle:'qa-tee',title:'QA Tee',description:'Test fixture garment description',images:[im,{...im,url:'https://cdn.shopify.com/test-back.png'}],options:[{name:'Color',values:['Green','Cream']},{name:'Size',values:['S','M','L']}],variants:[{id:'101',title:'Green / S',price:25,available:true,selectedOptions:[{name:'Color',value:'Green'},{name:'Size',value:'S'}],image:im},{id:'102',title:'Cream / M',price:29,available:true,selectedOptions:[{name:'Color',value:'Cream'},{name:'Size',value:'M'}],image:null},{id:'103',title:'Green / L',price:25,available:false,selectedOptions:[{name:'Color',value:'Green'},{name:'Size',value:'L'}],image:null}],minPrice:25,maxPrice:29,available:true}
const campaign={id:'qa-campaign',slug:'detroit-metropolitan-dance',organization_id:'qa-org',name:'QA campaign',status:'active',starts_at:null,ends_at:null,organization:{name:'Detroit Metropolitan Dance',slug:'detroit-metropolitan-dance',logoUrl:null},products:[product,{...product,id:'200',handle:'qa-hoodie',title:'QA Hoodie'}],shopifyConnected:true}
const root=createRoot(document.getElementById('app'))
const button=(text,scope=document)=>[...scope.querySelectorAll('button')].find(el=>el.textContent.trim()===text)
const click=async el=>{assert.ok(el,'Control exists');assert.equal(el.disabled,false,'Control enabled');await act(()=>el.click())}
async function render(props={}){await act(()=>root.render(React.createElement(DmdStorefront,{campaign,...props})))}
async function run(){
 await render()
 assert.ok(scrollCalls.some(call=>call.top===0),"Fresh storefront opens at the top")
 await click(button('Tees'))
 assert.equal(document.querySelectorAll('.dmd-product-card').length,1)
 assert.equal(document.querySelector('.dmd-product-caption a').getAttribute('href'),'/fundraisers/detroit-metropolitan-dance/products/qa-tee')
 await click(document.querySelector('.dmd-quick-button'))
 assert.ok(document.querySelector('[role="dialog"]'))
 await click(document.querySelector('.dmd-purchase-action button'))
 assert.match(document.querySelector('[role="status"]').textContent,/Select color/)
 await click(button('Green'));await click(button('S'))
 assert.equal(button('L').disabled,true)
 await act(()=>{const select=document.querySelector('.dmd-quantity select');select.value='2';select.dispatchEvent(new window.Event('change',{bubbles:true}))})
 await click(document.querySelector('.dmd-purchase-action button'))
 assert.equal(document.querySelector('.store-cart-copy>span').textContent,'Green / S')
 assert.match(document.querySelector('.store-cart-footer').textContent,/\$50\.00/)
 let saved=JSON.parse(localStorage.getItem('fundraiser-command-cart:qa-campaign'))
 assert.deepEqual([saved[0].productId,saved[0].variantId,saved[0].quantity,saved[0].campaignId,saved[0].organizationId],['100','101',2,'qa-campaign','qa-org'])
 await click(document.querySelector('[aria-label="Increase QA Tee quantity"]'))
 assert.match(document.querySelector('.store-cart-footer').textContent,/\$75\.00/)
 await click(document.querySelector('[aria-label="Decrease QA Tee quantity"]'))
 let request
 global.fetch=async(url,options)=>{request={url,...JSON.parse(options.body)};return {ok:true,json:async()=>({pricesChanged:true,items:[{variantId:'101',price:27}]})}}
 await click(document.querySelector('.store-checkout'))
 assert.deepEqual(request,{url:'/api/storefront/checkout',campaignSlug:'detroit-metropolitan-dance',items:[{variantId:'101',quantity:2,price:25}]})
 assert.match(document.querySelector('.store-error').textContent,/Prices have changed/)
 assert.match(document.querySelector('.store-cart-footer').textContent,/\$54\.00/)
 global.fetch=async()=>({ok:false,json:async()=>({error:'Item unavailable'})})
 await click(document.querySelector('.store-checkout'))
 assert.equal(document.querySelector('.store-error').textContent,'Item unavailable')
 await click(document.querySelector('.store-remove'))
 assert.match(document.querySelector('.store-cart-head').textContent,/empty/)
 await click(document.querySelector('[aria-label="Close cart"]'))
 await click(document.querySelector('[aria-label="Open menu"]'))
 assert.equal(document.querySelector('#dmd-main').hasAttribute('inert'),true)
 await act(()=>document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})))
 assert.equal(document.querySelector('.dmd-overlay'),null)
 await click(button('Search'))
 const input=document.querySelector('input[type=search]')
 await act(()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,'hoodie');input.dispatchEvent(new window.Event('input',{bubbles:true}))})
 assert.equal(document.querySelectorAll('.dmd-search-results>a').length,1)
 await click(document.querySelector('.dmd-close'))
 await render({product})
 await click(document.querySelector('[aria-label="Next image"]'))
 assert.match(document.querySelector('.dmd-gallery-main img').src,/test-back/)
 await click(document.querySelector('[aria-label="Zoom product image"]'))
 assert.equal(document.querySelector('.dmd-gallery-main').getAttribute('aria-pressed'),'true')
 await click(button('Cream'));await click(button('M'))
 assert.equal(document.querySelector('.dmd-price').textContent,'$29.00')
 await render({product,campaign:{...campaign,status:'closed'}})
 assert.equal(document.querySelector('.dmd-purchase-action button').disabled,true)
 await act(()=>root.unmount())
 console.log('PASS: DMD categories, product links, quick view, option validation, variant IDs, quantities, cart attribution, live-price/error handling, removal, accessible overlays, search, gallery, zoom, and closed-store protection.')
}
run().catch(error=>{console.error(error);process.exitCode=1})
