import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { shopifyGraphQL, clearShopifyAccessToken } from './admin'
import { reportingDay } from '@/lib/portal/reporting-period'
const ORDERS="query DepartmentHistory($after:String,$query:String!){orders(first:5,after:$after,query:$query,sortKey:CREATED_AT){nodes{id name createdAt cancelledAt displayFinancialStatus displayFulfillmentStatus currencyCode email phone shippingAddress{firstName lastName company address1 address2 city province provinceCode zip country countryCodeV2 phone} billingAddress{firstName lastName company address1 address2 city province provinceCode zip country countryCodeV2 phone} subtotalPriceSet{shopMoney{amount}} totalPriceSet{shopMoney{amount}} lineItems(first:25){nodes{id title variantTitle sku quantity currentQuantity product{id} variant{id} discountedUnitPriceAfterAllDiscountsSet{shopMoney{amount}}} pageInfo{hasNextPage endCursor}}} pageInfo{hasNextPage endCursor}}}"
const LINES="query DepartmentHistoryLines($id:ID!,$after:String){order(id:$id){lineItems(first:100,after:$after){nodes{id title variantTitle sku quantity currentQuantity product{id} variant{id} discountedUnitPriceAfterAllDiscountsSet{shopMoney{amount}}} pageInfo{hasNextPage endCursor}}}}"
const SCOPES="query HistoryAccess{currentAppInstallation{accessScopes{handle}}}"
export async function importDepartmentHistory(organizationId:string, cursor:string|null, expectedStart:string|null, through:string) {
  const db=createAdminClient()
  const {data:org,error}=await db.from('organizations').select('reporting_start_date').eq('id',organizationId).eq('is_active',true).single()
  if(error)throw error
  if(org.reporting_start_date!==expectedStart)throw new Error('The reporting date changed. Restart the import.')
  const start=org.reporting_start_date||'1970-01-01'
  let access=await shopifyGraphQL(SCOPES)
  const needsAllHistory=start<reportingDay(new Date(Date.now()-59*86400000))
  if(needsAllHistory&&!access.currentAppInstallation.accessScopes.some((s:any)=>s.handle==='read_all_orders')){
    // Pick up newly approved permissions without waiting for the cached token to expire.
    clearShopifyAccessToken()
    access=await shopifyGraphQL(SCOPES)
    if(!access.currentAppInstallation.accessScopes.some((s:any)=>s.handle==='read_all_orders'))
      throw new Error('Historical import has not started: Shopify only permits this app to read recent orders. Grant read_all_orders to the Fundraiser Command Shopify app, release the updated app version, approve its permissions if prompted, then retry. You can also select a start date within the past 59 days to import recent orders now.')
  }
  // Fetch a UTC buffer and let the database enforce exact Detroit calendar-day boundaries.
  const end=new Date(through+'T00:00:00Z');end.setUTCDate(end.getUTCDate()+2)
  const result=await shopifyGraphQL(ORDERS,{after:cursor,query:'created_at:>='+start+'T00:00:00Z created_at:<'+end.toISOString()})
  if(result.orders.pageInfo.hasNextPage&&(!result.orders.pageInfo.endCursor||result.orders.pageInfo.endCursor===cursor))throw new Error('Shopify order pagination stalled. Retry the import.')
  let imported=0,items=0,scanned=0
  for(const order of result.orders.nodes){
    scanned++
    if(reportingDay(order.createdAt)>through)continue
    const lines=[...order.lineItems.nodes]
    let page=order.lineItems.pageInfo
    while(page.hasNextPage){
      if(!page.endCursor)throw new Error('Shopify returned an incomplete line-item page. Retry the import.')
      const previousCursor=page.endCursor
      const more=await shopifyGraphQL(LINES,{id:order.id,after:page.endCursor})
      if(!more.order)throw new Error('Shopify order no longer exists: '+order.name)
      lines.push(...more.order.lineItems.nodes)
      page=more.order.lineItems.pageInfo
      if(page.hasNextPage&&page.endCursor===previousCursor)throw new Error('Shopify line-item pagination stalled. Retry the import.')
    }
    const {data,error}=await db.rpc('import_department_order',{target_org:organizationId,payload:{...order,lines}})
    if(error)throw error
    if(data>0){imported++;items+=data}
  }
  return {scanned,imported,items,nextCursor:result.orders.pageInfo.hasNextPage?result.orders.pageInfo.endCursor:null,through}
}
