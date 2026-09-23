import {redirect} from 'next/navigation'
import PortalShell from '@/components/portal/PortalShell'
import DmdPrivateStore from '@/components/portal/DmdPrivateStore'
import {getPortalData} from '@/lib/portal/data'
import {DMD_ORGANIZATION_ID,getDmdPrivateProducts} from '@/lib/shopify/dmd-private'
import {DMD_LOGIN} from '@/lib/branding/dmd'
import './private.css'

export const dynamic='force-dynamic'
export const metadata={title:'Private store | Detroit Metropolitan Dance'}

export default async function Page(){
  const d=await getPortalData(DMD_ORGANIZATION_ID)
  if(d.org.slug!=='detroit-metropolitan-dance')redirect(DMD_LOGIN)
  const products=await getDmdPrivateProducts()
  return <PortalShell org={d.org} campaign={d.campaign} campaigns={d.campaigns} userEmail={d.user.email||''} organizationId={d.organizationId} platform={d.platform} pinAccess={!!d.pinSession}>
    <DmdPrivateStore products={products}/>
  </PortalShell>
}
