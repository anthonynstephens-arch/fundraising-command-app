import {NextResponse} from "next/server"
import {createClient} from "@/lib/supabase/server"
import {createAdminClient} from "@/lib/supabase/admin"
import {getPortalPinSession} from "@/lib/pin-auth"
import {DMD_SLUG} from "@/lib/branding/dmd"

export const dynamic="force-dynamic"

const PRODUCT_KEYS=new Set([
  "cultivator-zip","comfort-colors-tee","youth-softstyle","softstyle-crewneck","long-sleeve","pocketed-short",
  "comfort-colors-hoodie","youth-full-zip","dmdyc-adult-zip","youth-track-jacket","womens-track-jacket",
])

async function authorize(organizationId:string){
  const auth=await createClient()
  const [{data:{user}},pin]=await Promise.all([auth.auth.getUser(),getPortalPinSession()])
  const db=createAdminClient()
  const {data:organization}=await db.from("organizations").select("id,slug").eq("id",organizationId).eq("is_active",true).maybeSingle()
  if(organization?.slug!==DMD_SLUG)return null

  if(pin?.organizationId===organizationId)return {db,identity:`pin:${pin.credentialId}`}
  if(!user)return null
  const [{data:platform},{data:membership}]=await Promise.all([
    db.from("platform_admins").select("user_id").eq("user_id",user.id).eq("is_active",true).maybeSingle(),
    db.from("organization_members").select("id").eq("organization_id",organizationId).eq("user_id",user.id).maybeSingle(),
  ])
  return platform||membership?{db,identity:`user:${user.id}`}:null
}

export async function GET(request:Request){
  const organizationId=new URL(request.url).searchParams.get("organizationId")||""
  const access=organizationId?await authorize(organizationId):null
  if(!access)return NextResponse.json({error:"Unauthorized"},{status:401})
  const {data,error}=await access.db.from("dmd_product_reviews").select("product_key,display_name,markup,updated_at").eq("organization_id",organizationId).order("product_key")
  if(error)return NextResponse.json({error:error.message},{status:400})
  return NextResponse.json({reviews:data||[]},{headers:{"Cache-Control":"no-store"}})
}

export async function POST(request:Request){
  try{
    const body=await request.json()
    const organizationId=typeof body.organizationId==="string"?body.organizationId:""
    const access=organizationId?await authorize(organizationId):null
    if(!access)return NextResponse.json({error:"Unauthorized"},{status:401})
    if(!Array.isArray(body.reviews)||body.reviews.length>PRODUCT_KEYS.size)return NextResponse.json({error:"Invalid product review data."},{status:400})

    const now=new Date().toISOString()
    const rows=body.reviews.map((review:any)=>{
      const productKey=typeof review.productKey==="string"?review.productKey:""
      if(!PRODUCT_KEYS.has(productKey))throw new Error("Invalid product review item.")
      const markup=Math.round(Math.max(0,Math.min(1000,Number(review.markup)||0))*100)/100
      return {organization_id:organizationId,product_key:productKey,display_name:typeof review.name==="string"?review.name.trim().slice(0,90):"",markup,updated_by_identity:access.identity,updated_at:now}
    })
    const {error}=await access.db.from("dmd_product_reviews").upsert(rows,{onConflict:"organization_id,product_key"})
    if(error)throw error
    return NextResponse.json({ok:true,updatedAt:now})
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to save product review."},{status:400})
  }
}
