import StationCollectionsPage from '@/components/stations/StationCollectionsPage'
export const dynamic='force-dynamic'
export default async function Collections({params}:{params:Promise<{id:string}>}) {
  const {id}=await params
  return <StationCollectionsPage id={id} adminView />
}
