import Link from 'next/link'
import {redirect,notFound} from 'next/navigation'
import {organizationAccess} from '@/lib/portal/organization-access'
import {departmentDetails} from '@/lib/portal/department-details'
import DepartmentDetailsStatus from '@/components/portal/DepartmentDetailsStatus'
import PayoutPreferences from '@/components/portal/PayoutPreferences'
import AgencyContacts from '@/components/portal/AgencyContacts'
export const dynamic='force-dynamic'
export default async function DetailsPage({searchParams}:{searchParams:Promise<{org?:string}>}){
 const {org}=await searchParams;if(!org)redirect('/portal')
 const access=await organizationAccess(org);if(!access)notFound()
 const data=await departmentDetails(access.db,org)
 if(!access.platform&&(!data.org.require_details||data.org.details_status==='approved'))redirect('/portal?org='+org)
 return <main style={{maxWidth:1100,margin:'0 auto',padding:'24px 16px'}}><header className="pe-heading"><h2>{data.org.name}</h2><Link href="/login">Sign in with another account</Link></header><DepartmentDetailsStatus organizationId={org}/>{access.canFinance&&<PayoutPreferences organizationId={org}/>}<AgencyContacts organizationId={org}/></main>
}
