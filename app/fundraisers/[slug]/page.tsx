import {notFound} from "next/navigation"
import {CampaignStorefront} from "@/components/storefront/CampaignStorefront"
import {getCampaignStorefront} from "@/lib/public/storefront"

export const dynamic="force-dynamic"

export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params
  const campaign=await getCampaignStorefront(slug)
  if(!campaign)notFound()
  return <CampaignStorefront campaign={campaign as any}/>
}
