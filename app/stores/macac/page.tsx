import { MacacStorefront } from '@/components/storefront/MacacStorefront'
import { getCampaignStorefront } from '@/lib/public/storefront'
import './store.css'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'MACAC | The Collection',
  description: 'Apparel and everyday essentials for the Michigan Association for College Admission Counseling community.',
}

export default async function Page() {
  // The collection remains browsable before the agency's catalog is activated.
  // Only real campaign variants can enter the existing validated checkout.
  let campaign = null
  try { campaign = await getCampaignStorefront('macac') }
  catch (error) { console.error('Unable to load MACAC catalog', error) }
  return <MacacStorefront campaign={campaign as any} />
}
