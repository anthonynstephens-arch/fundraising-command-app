import {NextResponse} from 'next/server'
import {organizationAccess} from '@/lib/portal/organization-access'
export async function POST(request:Request){
 const body=await request.json().catch(()=>null)
 if(!body||typeof body.organizationId!=='string'||typeof body.campaignId!=='string'||![body.organizationId,body.campaignId].every(id=>/^[0-9a-f-]{36}$/i.test(id)))return NextResponse.json({error:'Invalid designer program.'},{status:400})
 const access=await organizationAccess(body.organizationId)
 if(!access?.canFinance||access.org.organization_type!=='designer')return NextResponse.json({error:'Designer payout access required.'},{status:403})
 const {data:campaign,error:campaignError}=await access.db.from('campaigns').select('id').eq('id',body.campaignId).eq('organization_id',body.organizationId).eq('campaign_type','designer').maybeSingle()
 if(campaignError)return NextResponse.json({error:'Unable to check designer program.'},{status:500})
 if(!campaign)return NextResponse.json({error:'Designer program not found.'},{status:404})
 const {data,error}=await access.db.rpc('request_designer_payout',{target_campaign:campaign.id,input_actor:access.actor,input_note:typeof body.note==='string'?body.note.slice(0,1000):null})
 if(error)return NextResponse.json({error:error.message},{status:400})
 return NextResponse.json({ok:true,requestId:data},{headers:{'Cache-Control':'no-store'}})
}
