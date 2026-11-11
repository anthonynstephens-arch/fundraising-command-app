import { EchinusStorefront } from '@/components/storefront/EchinusStorefront'
import { getCampaignStorefront } from '@/lib/public/storefront'
import './store.css'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Echinus Development Advisors | The Collection',
  description: 'The official Echinus Development Advisors apparel and essentials collection.',
}

export default async function Page() {
  // The collection remains browsable before the agency's catalog is activated.
  // Only real campaign variants can enter the existing validated checkout.
  let campaign = null
  try { campaign = await getCampaignStorefront('echinus') }
  catch (error) { console.error('Unable to load Echinus Development Advisors catalog', error) }
  return <EchinusStorefront campaign={campaign as any} />
}
