import {NextResponse} from 'next/server'
import {organizationAccess} from '@/lib/portal/organization-access'
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})
export async function GET(request:Request){
 const id=new URL(request.url).searchParams.get('organizationId')||'',a=await organizationAccess(id)
 if(!a)return reply({error:'Unauthorized'},403)
 const [{data:contacts,error},{data:org}]=await Promise.all([a.db.from('agency_contacts').select('id,name,role,email,phone,notes').eq('organization_id',id).order('created_at'),a.db.from('organizations').select('is_union,union_name,union_local,organization_type').eq('id',id).single()])
 if(error)return reply({error:'Unable to load contacts.'},500)
 return reply({contacts,org,canManage:a.canManage})
}
export async function POST(request:Request){
 try{
  const b=await request.json(),a=await organizationAccess(b.organizationId)
  if(!a?.canManage)return reply({error:'Manager, admin, or owner access required.'},403)
  const value=(key:string,max:number)=>{const v=b[key];if(typeof v!=='string'||v.length>max)throw new Error('Check the contact fields.');return v.trim()}
  const data={name:value('name',120),role:value('role',100),email:value('email',254),phone:value('phone',40),notes:value('notes',1000)}
  if(data.name.length<2||!data.role)throw new Error('Enter a name and role.')
  if(data.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))throw new Error('Enter a valid email.')
  if(!data.email&&!data.phone)throw new Error('Enter an email or phone number.')
  const query=b.id?a.db.from('agency_contacts').update({...data,updated_at:new Date().toISOString()}).eq('id',b.id).eq('organization_id',b.organizationId):a.db.from('agency_contacts').insert({...data,organization_id:b.organizationId})
  const {data:saved,error}=await query.select('id').single()
  if(error||!saved)throw new Error('Unable to save this contact.')
  return reply({ok:true})
 }catch(e){return reply({error:e instanceof Error?e.message:'Unable to save contact.'},400)}
}
export async function DELETE(request:Request){
 const b=await request.json(),a=await organizationAccess(b.organizationId)
 if(!a?.canManage)return reply({error:'Manager, admin, or owner access required.'},403)
 const {error}=await a.db.from('agency_contacts').delete().eq('id',b.id).eq('organization_id',b.organizationId)
 return error?reply({error:'Unable to remove contact.'},400):reply({ok:true})
}
export async function PATCH(request:Request){
 const b=await request.json(),a=await organizationAccess(b.organizationId)
 if(!a?.canManage)return reply({error:'Manager, admin, or owner access required.'},403)
 if(!['fire','fire_department','detroit_fire_station'].includes(a.org.organization_type)||typeof b.isUnion!=='boolean')return reply({error:'Select union status for a fire department.'},400)
 const data={is_union:b.isUnion,union_name:b.isUnion?String(b.unionName||'').trim().slice(0,120):null,union_local:b.isUnion?String(b.unionLocal||'').trim().slice(0,60):null}
 const {error}=await a.db.from('organizations').update(data).eq('id',b.organizationId)
 return error?reply({error:'Unable to save union details.'},400):reply({ok:true})
}
