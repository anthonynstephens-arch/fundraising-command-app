import {NextResponse} from 'next/server'
import {organizationAccess} from '@/lib/portal/organization-access'
import {preparePayoutDetails,maskPayoutDetails} from '@/lib/portal/payout-profile'
const response=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})
export async function GET(request:Request){
 const id=new URL(request.url).searchParams.get('organizationId')||''
 const access=await organizationAccess(id)
 if(!access?.canFinance)return response({error:'Owner or admin access required.'},403)
 const {data,error}=await access.db.rpc('read_payout_profile',{input_org:id})
 if(error)return response({error:'Unable to load payout preferences.'},500)
 return response({details:maskPayoutDetails(data?.details||{}),version:data?.version||0,updatedAt:data?.updatedAt||null,canReveal:access.platform})
}
export async function PUT(request:Request){
 try{
  const body=await request.json(),access=await organizationAccess(body.organizationId)
  if(!access?.canFinance)return response({error:'Owner or admin access required.'},403)
  const {data:existing,error}=await access.db.rpc('read_payout_profile',{input_org:body.organizationId})
  if(error)throw new Error('Unable to load existing payout details.')
  const details=preparePayoutDetails(body.details||{},existing?.details||{})
  if(!Number.isInteger(body.version))throw new Error('Reload before saving.')
  const {error:saveError}=await access.db.rpc('save_payout_profile',{input_org:body.organizationId,input_details:details,input_version:body.version,input_actor:access.actor})
  if(saveError)return response({error:saveError.message.includes('Profile changed')?'This profile changed. Reload before saving.':'Unable to save payout preferences.'},409)
  return response({ok:true})
 }catch(error){return response({error:error instanceof Error?error.message:'Unable to save payout preferences.'},400)}
}
export async function POST(request:Request){
 const body=await request.json(),access=await organizationAccess(body.organizationId)
 if(!access?.platform)return response({error:'Platform owner access required.'},403)
 const {error:auditError}=await access.db.from('organization_profile_audit').insert({organization_id:body.organizationId,actor:access.actor,action:'payout_details_revealed'})
 if(auditError)return response({error:'Unable to record access.'},500)
 const {data,error}=await access.db.rpc('read_payout_profile',{input_org:body.organizationId})
 if(error)return response({error:'Unable to load payout details.'},500)
 return response({details:data?.details||{}})
}
