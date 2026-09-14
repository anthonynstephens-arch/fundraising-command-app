import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/admin/require-platform-admin'
import { syncCollection } from '@/lib/shopify/sync-collection'
import { revalidatePath } from 'next/cache'
export const dynamic='force-dynamic'
export const maxDuration=300
export async function POST(request:Request) {
  const gate=await requirePlatformAdmin()
  if(!gate.ok)return NextResponse.json({error:'Administrator sign-in required.'},{status:gate.status})
  try {
    const body=await request.json()
    if(typeof body.campaignId!=='string'||typeof body.collectionId!=='string')return NextResponse.json({error:'Choose a campaign and Shopify collection.'},{status:400})
    const result=await syncCollection(body.campaignId,body.collectionId)
    revalidatePath('/station','layout');revalidatePath('/portal','layout');revalidatePath('/dashboard','layout')
    return NextResponse.json(result)
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Collection sync failed.'},{status:400})}
}
