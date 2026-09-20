import {redirect,notFound} from "next/navigation"
import {createClient} from "@/lib/supabase/server"
import {createAdminClient} from "@/lib/supabase/admin"
import {getPortalPinSession} from "@/lib/pin-auth"
import {DMD_SLUG,DMD_LOGIN} from "@/lib/branding/dmd"
export const dynamic="force-dynamic"
export default async function Page(){
  const auth=await createClient()
  const [{data:{user}},pin]=await Promise.all([auth.auth.getUser(),getPortalPinSession()])
  if(!user&&!pin)redirect(DMD_LOGIN)
  const {data:org,error}=await createAdminClient().from("organizations").select("id").eq("slug",DMD_SLUG).eq("is_active",true).maybeSingle()
  if(error)throw error
  if(!org)notFound()
  // The portal revalidates membership/platform authority for this exact organization.
  redirect("/portal?org="+encodeURIComponent(org.id))
}
