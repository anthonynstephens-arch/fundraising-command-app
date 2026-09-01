import { redirect } from "next/navigation"
import DashboardChrome from "@/components/admin/DashboardChrome"
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin"

export default async function DashboardLayout({children}:{children:React.ReactNode}){
  const gate=await requirePlatformAdmin()
  if(!gate.ok){
    if(gate.status===401) redirect("/login")
    redirect("/portal")
  }
  return <DashboardChrome>{children}</DashboardChrome>
}