import {NextResponse} from 'next/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {importDepartmentHistory} from '@/lib/shopify/import-history'
export const maxDuration=300
export const dynamic='force-dynamic'
export async function GET(request:Request){
 if(!process.env.CRON_SECRET||request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:'Unauthorized'},{status:401})
 const db=createAdminClient(),now=new Date().toISOString(),started=Date.now()
 const {data:jobs,error}=await db.from('collection_history_imports').select('*').in('state',['pending','running']).or('lease_until.is.null,lease_until.lt.'+now).limit(1);if(error)throw error
 const job=jobs?.[0];if(!job)return NextResponse.json({ok:true,pending:0})
 const lease=new Date(Date.now()+300000).toISOString()
 const {data:claimed,error:ce}=await db.from('collection_history_imports').update({state:'running',lease_until:lease}).eq('organization_id',job.organization_id).or('lease_until.is.null,lease_until.lt.'+now).select('*').maybeSingle();if(ce)throw ce;if(!claimed)return NextResponse.json({ok:true,claimed:false})
 try{
  const {data:org,error:oe}=await db.from('organizations').select('reporting_start_date').eq('id',job.organization_id).single();if(oe)throw oe
  let cursor=job.cursor,scanned=job.scanned,imported=job.imported,items=job.items,state='running'
  do{
   const result=await importDepartmentHistory(job.organization_id,cursor,org.reporting_start_date,job.through_date)
   cursor=result.nextCursor;scanned+=result.scanned;imported+=result.imported;items+=result.items;state=cursor?'running':'completed'
   const {error:se}=await db.from('collection_history_imports').update({cursor,scanned,imported,items,state,updated_at:new Date().toISOString(),last_error:null}).eq('organization_id',job.organization_id).eq('lease_until',lease);if(se)throw se
  }while(cursor&&Date.now()-started<230000)
  await db.from('collection_history_imports').update({lease_until:null}).eq('organization_id',job.organization_id).eq('lease_until',lease)
  return NextResponse.json({ok:true,state,scanned,imported,items})
 }catch(e){await db.from('collection_history_imports').update({state:'failed',lease_until:null,last_error:e instanceof Error?e.message:'Import failed.',updated_at:new Date().toISOString()}).eq('organization_id',job.organization_id).eq('lease_until',lease);return NextResponse.json({error:'Historical import failed; details recorded.'},{status:500})}
}
