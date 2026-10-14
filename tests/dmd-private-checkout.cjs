const assert=require('node:assert/strict')
const fs=require('node:fs')
const babel=require('next/dist/compiled/babel/core')
const vm=require('node:vm')
let allowed=false,calls=0,input
const product={id:'1',title:'DMD tee',description:'Hemp',variants:[{id:'101',title:'S / Hemp',price:'18.00',inventoryPolicy:'CONTINUE',inventoryQuantity:null}]}
function load(file,mocks){const exports={};vm.runInNewContext(babel.transformSync(fs.readFileSync(file,'utf8'),{filename:file,envName:'test',presets:[require('next/babel')],babelrc:false,configFile:false}).code,{exports,require:n=>{if(n in mocks)return mocks[n];return require(n)},console,URL,Map,Set,Date});return exports}
const route=load('app/api/dmd/private-checkout/route.ts',{
 'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status||200})}},
 '@/lib/shopify/dmd-access':{hasDmdPortalAccess:async()=>allowed},
 '@/lib/shopify/dmd-private':{getDmdPrivateProducts:async()=>[product],DMD_ORGANIZATION_ID:'org',DMD_COMPANY_ID:'gid://shopify/Company/1'},
 '@/lib/shopify/admin':{stripShopifyGid:id=>id.split('/').pop(),toShopifyGid:(type,id)=>`gid://shopify/${type}/${id}`,shopifyGraphQL:async(q,variables)=>{calls++;input=variables.input;return {draftOrderCreate:{draftOrder:{invoiceUrl:'https://checkout.example/private'},userErrors:[]}}}}
})
const post=body=>route.POST({json:async()=>body})
;(async()=>{
 assert.equal((await post({items:[{variantId:'101',quantity:1}]})).status,403)
 assert.equal(calls,0,'Anonymous checkout must never create discounted orders')
 allowed=true
 assert.equal((await post({items:[{variantId:'999',quantity:1}]})).status,409)
 assert.equal(calls,0,'Noncatalog variants rejected')
 assert.equal((await post({items:[{variantId:'101',quantity:101}]})).status,400)
 assert.equal((await post({items:[{variantId:'101',quantity:2,price:0.01}],price:0.01})).status,200)
 assert.deepEqual(JSON.parse(JSON.stringify(input.lineItems)),[{variantId:'gid://shopify/ProductVariant/101',quantity:2,priceOverride:{amount:'18.00',currencyCode:'USD'}}])
 assert.equal(input.allowDiscountCodesInCheckout,false)
 assert.equal(input.acceptAutomaticDiscounts,false)
 assert.ok(input.customAttributes.some(a=>a.key==='fundraiser_private_store'&&a.value==='dmd'))
 product.variants[0].inventoryPolicy='DENY';product.variants[0].inventoryQuantity=0
 assert.equal((await post({items:[{variantId:'101',quantity:1}]})).status,409)
 console.log('DMD private checkout: access, catalog validation, server prices, discounts, and unavailable items passed')
})().catch(e=>{console.error(e);process.exit(1)})
