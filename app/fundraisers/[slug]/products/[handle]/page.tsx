import type {Metadata} from "next"
import {notFound} from "next/navigation"
import {StorefrontProductPage} from "@/components/storefront/CampaignStorefront"
import {getCampaignStorefront} from "@/lib/public/storefront"

export const dynamic="force-dynamic"

export async function generateMetadata({params}:{params:Promise<{slug:string;handle:string}>}):Promise<Metadata>{
  const {slug,handle}=await params
  const campaign=await getCampaignStorefront(slug)
  const product=campaign?.products.find((item:any)=>item.handle===handle)
  return product?{title:`${product.title} | ${campaign.name}`,description:product.description||`Shop ${product.title} and support ${campaign.organization.name}.`}:{title:"Product | Fundraiser Command"}
}

export default async function Page({params}:{params:Promise<{slug:string;handle:string}>}){
  const {slug,handle}=await params
  const campaign=await getCampaignStorefront(slug)
  if(!campaign)notFound()
  const product=campaign.products.find((item:any)=>item.handle===handle)
  if(!product)notFound()
  return <StorefrontProductPage campaign={campaign as any} product={product}/>
}
