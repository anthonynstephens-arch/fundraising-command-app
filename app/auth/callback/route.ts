import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request:Request){
  const url=new URL(request.url)
  const code=url.searchParams.get("code")
  const next=url.searchParams.get("next")||"/home"
  if(code){
    const supabase=await createClient()
    const {error}=await supabase.auth.exchangeCodeForSession(code)
    if(!error) return NextResponse.redirect(new URL(next,url.origin))
  }
  const err=url.searchParams.get("error_description")||"Invitation link is invalid or has expired."
  return NextResponse.redirect(new URL("/auth/invite?error="+encodeURIComponent(err),url.origin))
}
