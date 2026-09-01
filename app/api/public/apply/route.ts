import {NextResponse} from "next/server"
import {createAdminClient} from "@/lib/supabase/admin"
export const dynamic="force-dynamic"
const txt=(v:unknown,max=500)=>typeof v==="string"?v.trim().slice(0,max):""
export async function POST(req:Request){
 try{
   const b=await req.json()
   const row={organization_name:txt(b.organization_name,180),organization_type:txt(b.organization_type,80),contact_name:txt(b.contact_name,160),contact_email:txt(b.contact_email,220).toLowerCase(),contact_phone:txt(b.contact_phone,80)||null,requested_campaign_type:txt(b.requested_campaign_type,120)||"fundraiser",message:txt(b.message,3000)||null,status:"pending"}
   if(!row.organization_name||!row.organization_type||!row.contact_name||!row.contact_email) return NextResponse.json({error:"Please complete all required fields."},{status:400})
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.contact_email)) return NextResponse.json({error:"Enter a valid email address."},{status:400})
   const {error}=await createAdminClient().from("applications").insert(row); if(error) throw error
   return NextResponse.json({ok:true})
 }catch(e){console.error(e);return NextResponse.json({error:"Unable to submit application right now."},{status:500})}
}