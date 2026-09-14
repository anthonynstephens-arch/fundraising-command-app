import { notFound } from 'next/navigation'
import PortalSection from '@/app/portal/[section]/page'
import PortalMembers from '@/app/portal/members/page'
import { stationAccess } from '@/lib/stations/data'
import StationCollectionsPage from '@/components/stations/StationCollectionsPage'
export const dynamic = 'force-dynamic'
export default async function StationSection({params, searchParams}: {params: Promise<{id:string;section:string}>; searchParams:Promise<{campaign?:string}>}) {
  const {id,section}=await params
  await stationAccess(id)
  if(section==='collections') return <StationCollectionsPage id={id} />
  if(section==='members') return <PortalMembers searchParams={Promise.resolve({org:id})} />
  if(!['sales','orders','products','progress','reports','marketing','help','settings'].includes(section)) notFound()
  const {campaign}=await searchParams
  return <PortalSection params={Promise.resolve({section})} searchParams={Promise.resolve({org:id,campaign})} />
}
