import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export default async function HomeRouter(){
  const auth=await createClient()
  const {data:{user}}=await auth.auth.getUser()
  if(!user) redirect("/login")
  const db=createAdminClient()
  const [{data:platform},{data:membership}]=await Promise.all([
    db.from("platform_admins").select("user_id").eq("user_id",user.id).eq("is_active",true).maybeSingle(),
    db.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).maybeSingle()
  ])
  if(platform) redirect("/dashboard")
  if(membership) redirect("/portal")
  redirect("/apply")
}