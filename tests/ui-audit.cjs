const assert=require("node:assert/strict")
const fs=require("node:fs")
const vm=require("node:vm")
const {stripTypeScriptTypes}=require("node:module")
const source=fs.readFileSync("app/api/storefront/checkout/route.ts","utf8")
let assigned=true, available=true
const db={from(table){const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:{id:"campaign",slug:"test",organization_id:"org",status:"active"}}),in:async()=>({data:assigned?[{shopify_variant_id:"123"}]:[]})};return q}}
const routeExports={}
const executable=stripTypeScriptTypes(source)
 .replace(/import \{([^}]+)\} from "([^"]+)"/g,(_,names,path)=>"const {"+names+"}=require("+JSON.stringify(path)+")")
 .replace(/export /g,"")+"\nexports.POST=POST;"
vm.runInNewContext(executable,{
 exports:routeExports,console,URLSearchParams,require(name){
 if(name==="next/server")return {NextResponse:{json:(body,options)=>({body,status:options?.status||200})}}
 if(name.includes("supabase/admin"))return {createAdminClient:()=>db}
 if(name.includes("shopify/admin"))return {toShopifyGid:(_,id)=>id,getShopifyConfig:()=>({shopDomain:"example.myshopify.com"}),shopifyGraphQL:async()=>({nodes:[{id:"123",price:"45.00",inventoryPolicy:"DENY",inventoryQuantity:available?5:0,product:{status:"ACTIVE"}}]})}
 throw Error(name)
 }})
const post=(price)=>routeExports.POST({json:async()=>({campaignSlug:"test",items:[{variantId:"123",quantity:1,...(price===undefined?{}:{price})}]})})
;(async()=>{
 let result=await post(40);assert.equal(result.body.pricesChanged,true);assert.equal(result.body.items[0].price,45);assert.equal(result.body.checkoutUrl,undefined)
 result=await post();assert.equal(result.body.pricesChanged,true)
 result=await post(45);assert.equal(result.status,200);assert.match(result.body.checkoutUrl,/cart\/123:1/);assert.match(result.body.checkoutUrl,/fundraiser_campaign_id/)
 available=false;assert.equal((await post(45)).status,409)
 available=true;assigned=false;assert.equal((await post(45)).status,409)
 const gallery=fs.readFileSync("components/storefront/CampaignStorefront.tsx","utf8")
 assert.match(gallery,/imageIndex >= 0 \? product.images\[imageIndex\]/)
 assert.ok(!gallery.includes('value="newest"'))
 const directory=fs.readFileSync("app/fundraisers/page.tsx","utf8")
 assert.ok(directory.includes('<article className="pub-campaign-card"'))
 const dialog=fs.readFileSync("components/public/useDialogAccessibility.ts","utf8")
 assert.ok(dialog.includes('event.key==="Escape"')&&dialog.includes('event.key!=="Tab"'))
 console.log("PASS: live-price confirmation, checkout attribution, sold-out/unassigned rejection, gallery precedence and accessibility wiring.")
})().catch(error=>{console.error(error);process.exitCode=1})
