import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {getPortalPinSession} from '@/lib/pin-auth'
import {DMD_SLUG} from '@/lib/branding/dmd'

export const dynamic='force-dynamic'

async function authorize(organizationId:string){
  const auth=await createClient()
  const [{data:{user}},pin]=await Promise.all([auth.auth.getUser(),getPortalPinSession()])
  const db=createAdminClient()
  const {data:org}=await db.from('organizations').select('id,slug').eq('id',organizationId).eq('is_active',true).maybeSingle()
  if(org?.slug!==DMD_SLUG) return null
  if(!user) return pin?.organizationId===organizationId ? {db,identity:`pin:${pin.credentialId}`,name:pin.displayName,admin:false} : null
  const [{data:platform},{data:member}]=await Promise.all([
    db.from('platform_admins').select('user_id').eq('user_id',user.id).eq('is_active',true).maybeSingle(),
    db.from('organization_members').select('id').eq('organization_id',organizationId).eq('user_id',user.id).maybeSingle(),
  ])
  if(!platform&&!member) return pin?.organizationId===organizationId ? {db,identity:`pin:${pin.credentialId}`,name:pin.displayName,admin:false} : null
  return {db,identity:`user:${user.id}`,name:user.email||'DMD member',admin:!!platform}
}

export async function GET(request:Request){
  const organizationId=new URL(request.url).searchParams.get('organizationId')||''
  const access=organizationId?await authorize(organizationId):null
  if(!access) return NextResponse.json({error:'Unauthorized'},{status:401})
  let query=access.db.from('dmd_sign_proof_selections').select('id,front_proof,back_proof,selected_by_name,created_at').eq('organization_id',organizationId).order('created_at',{ascending:false}).limit(100)
  if(!access.admin) query=query.eq('selected_by_identity',access.identity)
  const {data,error}=await query
  if(error) return NextResponse.json({error:'Could not load saved selections.'},{status:500})
  return NextResponse.json({selections:data||[]},{headers:{'Cache-Control':'no-store'}})
}

export async function POST(request:Request){
  let body:any
  try{body=await request.json()}catch{return NextResponse.json({error:'Invalid selection.'},{status:400})}
  const organizationId=typeof body.organizationId==='string'?body.organizationId:''
  const access=organizationId?await authorize(organizationId):null
  if(!access) return NextResponse.json({error:'Unauthorized'},{status:401})
  const front=body.frontProof,back=body.backProof
  if(!Number.isInteger(front)||!Number.isInteger(back)||front<1||front>10||back<1||back>10||front===back){
    return NextResponse.json({error:'Choose two different proofs for the front and back.'},{status:400})
  }
  const {data,error}=await access.db.from('dmd_sign_proof_selections').insert({organization_id:organizationId,front_proof:front,back_proof:back,selected_by_identity:access.identity,selected_by_name:access.name}).select('id').single()
  if(error) return NextResponse.json({error:'Could not save your selection.'},{status:500})
  return NextResponse.json({ok:true,id:data.id})
}
