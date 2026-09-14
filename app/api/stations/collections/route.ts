import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requirePlatformAdmin } from '@/lib/admin/require-platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { STATION_TYPE } from '@/lib/stations/data'
import { fetchCollection, syncCollection } from '@/lib/shopify/sync-collection'
import { stripShopifyGid } from '@/lib/shopify/admin'
export const dynamic='force-dynamic'
export const maxDuration=300
export async function POST(request:Request) {
  const gate=await requirePlatformAdmin()
  if(!gate.ok)return NextResponse.json({error:'Sign in with your platform administrator email to assign collections.'},{status:gate.status})
  let campaignId:string|undefined
  try {
    const body=await request.json()
    if(typeof body.stationId!=='string'||typeof body.collectionId!=='string')return NextResponse.json({error:'Choose a station and Shopify collection.'},{status:400})
    const db=createAdminClient()
    const {data:station,error:se}=await db.from('organizations').select('id,name').eq('id',body.stationId).eq('organization_type',STATION_TYPE).eq('is_active',true).maybeSingle()
    if(se)throw se
    if(!station)return NextResponse.json({error:'Station not found.'},{status:404})
    const {data:campaigns,error:ce}=await db.from('campaigns').select('id').eq('organization_id',station.id)
    if(ce)throw ce
    if(body.campaignId && !campaigns?.some(c=>c.id===body.campaignId))return NextResponse.json({error:'That fund belongs to another station.'},{status:403})
    const collection=await fetchCollection(body.collectionId)
    campaignId=body.campaignId || undefined
    if(!campaignId && campaigns?.length) {
      const {data:linked,error}=await db.from('campaign_shopify_collections').select('campaign_id').in('campaign_id',campaigns.map(c=>c.id)).eq('shopify_collection_id',stripShopifyGid(collection.id)).limit(1).maybeSingle()
      if(error)throw error
      campaignId=linked?.campaign_id
    }
    if(!campaignId) {
      // Stable slug makes retries reuse the same fund instead of creating duplicates.
      const slug=`station-${station.id}-${stripShopifyGid(collection.id)}`
      const {data:existing,error}=await db.from('campaigns').select('id').eq('organization_id',station.id).eq('slug',slug).maybeSingle()
      if(error)throw error
      campaignId=existing?.id
      if(!campaignId) {
        const {data,error}=await db.from('campaigns').insert({organization_id:station.id,name:collection.title,slug,campaign_type:'department-store',status:'active',min_payout_threshold:100}).select('id').single()
        if(error) {
          if(error.code!=='23505')throw error
          const retry=await db.from('campaigns').select('id').eq('organization_id',station.id).eq('slug',slug).single()
          if(retry.error)throw retry.error
          campaignId=retry.data.id
        } else campaignId=data.id
      }
    }
    const result=await syncCollection(campaignId!,collection.id,station.id,collection)
    revalidatePath('/station','layout');revalidatePath('/portal','layout');revalidatePath('/dashboard','layout')
    return NextResponse.json(result)
  } catch(error) {
    return NextResponse.json({error:error instanceof Error?error.message:'Unable to assign and sync the collection.',campaignId},{status:400})
  }
}
