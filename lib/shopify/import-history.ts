import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { shopifyGraphQL } from './admin'
import { reportingDay } from '@/lib/portal/reporting-period'
const ORDERS="query DepartmentHistory($after:String,$query:String!){orders(first:10,after:$after,query:$query,sortKey:CREATED_AT){nodes{id name createdAt cancelledAt displayFinancialStatus displayFulfillmentStatus currencyCode subtotalPriceSet{shopMoney{amount}} totalPriceSet{shopMoney{amount}} lineItems(first:100){nodes{id title variantTitle sku quantity currentQuantity product{id} variant{id} discountedUnitPriceAfterAllDiscountsSet{shopMoney{amount}}} pageInfo{hasNextPage endCursor}}} pageInfo{hasNextPage endCursor}}}"
const LINES="query DepartmentHistoryLines($id:ID!,$after:String){order(id:$id){lineItems(first:100,after:$after){nodes{id title variantTitle sku quantity currentQuantity product{id} variant{id} discountedUnitPriceAfterAllDiscountsSet{shopMoney{amount}}} pageInfo{hasNextPage endCursor}}}}"
const SCOPES="query HistoryAccess{currentAppInstallation{accessScopes{handle}}}"
export async function importDepartmentHistory(organizationId:string, cursor:string|null, expectedStart:string|null, through:string) {
  const db=createAdminClient()
  const {data:org,error}=await db.from('organizations').select('reporting_start_date').eq('id',organizationId).eq('is_active',true).single()
  if(error)throw error
  if(org.reporting_start_date!==expectedStart)throw new Error('The reporting date changed. Restart the import.')
  const start=org.reporting_start_date||'1970-01-01'
  const access=await shopifyGraphQL(SCOPES)
  const scopes=access.currentAppInstallation.accessScopes.map((s:any)=>s.handle)
  if(!scopes.includes('read_all_orders') && start<reportingDay(new Date(Date.now()-59*86400000)))
    throw new Error('Shopify has not granted this app read_all_orders access. Enable historical order access in Shopify before importing this date range; older orders will not be silently skipped.')
  // Fetch a UTC buffer and let the database enforce exact Detroit calendar-day boundaries.
  const end=new Date(through+'T00:00:00Z');end.setUTCDate(end.getUTCDate()+2)
  const result=await shopifyGraphQL(ORDERS,{after:cursor,query:'created_at:>='+start+'T00:00:00Z created_at:<'+end.toISOString()})
  let imported=0,items=0,scanned=0
  for(const order of result.orders.nodes){
    scanned++
    if(reportingDay(order.createdAt)>through)continue
    const lines=[...order.lineItems.nodes]
    let page=order.lineItems.pageInfo
    while(page.hasNextPage){
      const more=await shopifyGraphQL(LINES,{id:order.id,after:page.endCursor})
      if(!more.order)throw new Error('Shopify order no longer exists: '+order.name)
      lines.push(...more.order.lineItems.nodes)
      page=more.order.lineItems.pageInfo
    }
    const {data,error}=await db.rpc('import_department_order',{target_org:organizationId,payload:{...order,lines}})
    if(error)throw error
    if(data>0){imported++;items+=data}
  }
  return {scanned,imported,items,nextCursor:result.orders.pageInfo.hasNextPage?result.orders.pageInfo.endCursor:null,through}
}
