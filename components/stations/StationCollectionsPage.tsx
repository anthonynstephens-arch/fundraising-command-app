import PortalShell from '@/components/portal/PortalShell'
import StationCollectionManager from './StationCollectionManager'
import {stationAccess} from '@/lib/stations/data'
export default async function StationCollectionsPage({id,adminView=false}:{id:string;adminView?:boolean}) {
  const d=await stationAccess(id)
  const {data:campaigns,error}=await d.db.from('campaigns').select('id,name,status').eq('organization_id',id).order('created_at',{ascending:false})
  if(error)throw error
  const funds=await Promise.all((campaigns||[]).map(async c=>{
    const [links,products]=await Promise.all([
      d.db.from('campaign_shopify_collections').select('id,title,shopify_collection_id,last_synced_at').eq('campaign_id',c.id).order('title'),
      d.db.from('campaign_products').select('shopify_product_id').eq('campaign_id',c.id).eq('is_active',true),
    ])
    if(links.error)throw links.error;if(products.error)throw products.error
    return {...c,collections:links.data||[],products:new Set((products.data||[]).map(p=>p.shopify_product_id)).size}
  }))
  const content=<><div className="agency-page-head"><div><h1>{d.station.name} · Collections</h1><p>Shopify products assigned to this station</p></div></div><StationCollectionManager stationId={id} stationName={d.station.name} funds={funds} canAssign={d.admin}/></>
  if(adminView)return content
  const lastSynced=funds.flatMap(f=>f.collections.map(c=>c.last_synced_at)).filter(Boolean).sort().at(-1)
  return <PortalShell org={d.station} campaign={campaigns?.[0]} campaigns={campaigns||[]} organizationId={id} userEmail={d.user.email||''} platform={d.admin} lastSynced={lastSynced}>{content}</PortalShell>
}
