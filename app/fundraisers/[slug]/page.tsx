import {notFound} from "next/navigation"
import {CampaignStorefront} from "@/components/storefront/CampaignStorefront"
import {getCampaignStorefront} from "@/lib/public/storefront"

export async function generateMetadata({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params
  if(slug==="detroit-metropolitan-dance")return {title:"Official Store | Detroit Metropolitan Dance",description:"The official Detroit Metropolitan Dance merchandise collection. Rooted in Detroit. Made to move."}
  return {title:"Official Fundraiser Store | Fundraiser Command"}
}

export const dynamic="force-dynamic"

export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params
  const campaign=await getCampaignStorefront(slug)
  if(!campaign)notFound()
  return <CampaignStorefront campaign={campaign as any}/>
}
